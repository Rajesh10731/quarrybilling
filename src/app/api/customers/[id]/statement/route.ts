import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Bill } from "@/models/Bill";
import { getSession } from "@/lib/auth";

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
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";

    await connectToDatabase();

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    // Find all bills for this customer (matched by customer name)
    const bills = await Bill.find({
      $or: [
        { "billedTo.name": { $regex: `^${customer.name.trim()}$`, $options: "i" } },
        { "shippedTo.name": { $regex: `^${customer.name.trim()}$`, $options: "i" } },
      ],
    }).sort({ date: 1, createdAt: 1 });

    // Transform into Statement Line Items (matching the screenshot format)
    const statementRows: any[] = [];
    let totalDebit = 0;
    let totalCredit = 0;

    bills.forEach((bill) => {
      const items = bill.items || [];
      const loadingPerItem = bill.loadingCharges ? bill.loadingCharges / items.length : 0;
      const freightPerItem = bill.lorryFreight ? bill.lorryFreight / items.length : 0;

      // Determine credit amount for this bill
      const status = bill.paymentStatus || "UNPAID";
      let billPaidAmount = 0;
      if (status === "PAID") {
        billPaidAmount = bill.grandTotal || 0;
      } else if (status === "PARTIAL") {
        billPaidAmount = bill.paidAmount || 0;
      }

      items.forEach((item, itemIdx) => {
        const itemTotal = (item.amount || 0) + loadingPerItem + freightPerItem;
        totalDebit += itemTotal;

        // Proportional credit for multi-item bills if partial/paid
        let itemCredit = 0;
        if (status === "PAID") {
          itemCredit = itemTotal;
        } else if (status === "PARTIAL" && bill.grandTotal > 0) {
          itemCredit = Math.round((billPaidAmount * (itemTotal / bill.grandTotal)) * 100) / 100;
        }
        totalCredit += itemCredit;

        statementRows.push({
          billId: bill._id,
          date: bill.date,
          billNo: bill.invoiceNo,
          vehicleNo: bill.vehicleNo || "--",
          material: item.description,
          rate: item.price,
          qty: item.qty,
          unit: item.unit,
          amount: item.amount,
          loading: loadingPerItem,
          lorryFri: freightPerItem,
          total: itemTotal,
          credit: itemCredit,
          debit: itemTotal,
          paymentStatus: status,
          paidAmount: billPaidAmount,
          grandTotal: bill.grandTotal,
          deliveryPlace: bill.deliveryPlace || bill.station || bill.billedTo?.address || "",
        });
      });
    });

    const closingBalance = (customer.openingBalance || 0) + totalDebit - totalCredit;

    return NextResponse.json({
      customer,
      period: {
        fromDate: fromDate || "01-04-2026",
        toDate: toDate || "31-03-2027",
      },
      rows: statementRows,
      summary: {
        openingBalance: customer.openingBalance || 0,
        totalDebit,
        totalCredit,
        closingBalance,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to generate statement" },
      { status: 500 }
    );
  }
}
