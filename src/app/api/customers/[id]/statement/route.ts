import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Bill, IBill } from "@/models/Bill";
import { Payment } from "@/models/Payment";
import { getSession } from "@/lib/auth";
import { errorResponse, exactName, round2, toISODate } from "@/lib/ledger";

/** Current Indian financial year (1 Apr – 31 Mar) as YYYY-MM-DD strings. */
function currentFinancialYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

/** One ledger row per bill item; loading / freight are spread evenly over the items. */
function billRows(bill: IBill) {
  const items = bill.items || [];
  const share = (charge: number) => (charge && items.length ? charge / items.length : 0);
  const base = {
    type: "bill",
    billId: bill._id,
    date: bill.date,
    billNo: bill.invoiceNo,
    vehicleNo: bill.vehicleNo || "--",
    paymentStatus: bill.paymentStatus || "UNPAID",
    deliveryPlace: bill.deliveryPlace || bill.station || bill.billedTo?.address || "",
    credit: 0,
  };
  if (!items.length) {
    const total = round2((bill.loadingCharges || 0) + (bill.lorryFreight || 0));
    return [{ ...base, material: "--", rate: 0, qty: 0, unit: "", amount: 0, loading: bill.loadingCharges || 0, lorryFri: bill.lorryFreight || 0, total, debit: total }];
  }
  return items.map((item) => {
    const loading = share(bill.loadingCharges);
    const lorryFri = share(bill.lorryFreight);
    const total = round2((item.amount || 0) + loading + lorryFri);
    return { ...base, material: item.description, rate: item.price, qty: item.qty, unit: item.unit, amount: item.amount, loading, lorryFri, total, debit: total };
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fy = currentFinancialYear();
    const fromDate = toISODate(searchParams.get("fromDate")) || fy.from;
    const toDate = toISODate(searchParams.get("toDate")) || fy.to;

    await connectToDatabase();

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    // The customer owes for bills billed to them (same rule as the payment report)
    const bills = await Bill.find({ "billedTo.name": exactName(customer.name) }).sort({ date: 1, createdAt: 1 });
    const payments = await Payment.find({
      $or: [{ customerId: customer._id }, { customerName: exactName(customer.name) }],
    }).sort({ date: 1, createdAt: 1 });

    // Everything before the period rolls into the opening balance for the period
    let openingBalance = customer.openingBalance || 0;
    const statementRows: any[] = [];

    for (const bill of bills) {
      const rows = billRows(bill);
      if (bill.date < fromDate) {
        openingBalance += rows.reduce((s, r) => s + r.debit, 0);
      } else if (bill.date <= toDate) {
        statementRows.push(...rows);
      }
    }

    for (const p of payments) {
      if (p.date < fromDate) {
        openingBalance -= p.amount || 0;
      } else if (p.date <= toDate) {
        statementRows.push({
          type: "payment",
          paymentId: p._id,
          billId: p.billId,
          date: p.date,
          billNo: p.paymentNumber,
          invoiceNo: p.invoiceNo || "",
          vehicleNo: "--",
          material: `PAYMENT RECEIVED (${p.paymentMode}${p.referenceNo ? " · " + p.referenceNo : ""})${p.invoiceNo ? " – Inv " + p.invoiceNo : " – On account"}`,
          rate: 0,
          qty: 0,
          amount: 0,
          loading: 0,
          lorryFri: 0,
          total: 0,
          credit: p.amount || 0,
          debit: 0,
          deliveryPlace: "",
          paymentStatus: "",
        });
      }
    }

    // Chronological; on the same day, bills before the payments against them
    statementRows.sort((a, b) => (a.date === b.date ? (a.type === b.type ? 0 : a.type === "bill" ? -1 : 1) : a.date < b.date ? -1 : 1));

    const totalDebit = round2(statementRows.reduce((s, r) => s + (r.debit || 0), 0));
    const totalCredit = round2(statementRows.reduce((s, r) => s + (r.credit || 0), 0));
    openingBalance = round2(openingBalance);

    return NextResponse.json({
      customer,
      period: { fromDate, toDate },
      rows: statementRows,
      summary: {
        openingBalance,
        totalDebit,
        totalCredit,
        closingBalance: round2(openingBalance + totalDebit - totalCredit),
      },
    });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to generate statement");
    return NextResponse.json(body, { status });
  }
}
