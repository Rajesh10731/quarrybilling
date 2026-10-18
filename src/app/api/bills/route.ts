import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";
import { getSession } from "@/lib/auth";
import {
  BILL_HEADER_FIELDS,
  applyBillTotals,
  assertUniqueInvoiceNo,
  billHeaderFromSettings,
  containsText,
  errorResponse,
  recalcBill,
  recordPayment,
  round2,
  suggestNextInvoiceNo,
  toISODate,
  upsertCustomer,
} from "@/lib/ledger";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    if (searchParams.get("nextInvoiceNo")) {
      return NextResponse.json({ invoiceNo: await suggestNextInvoiceNo() });
    }

    let filter = {};
    if (query) {
      filter = {
        $or: [
          { invoiceNo: containsText(query) },
          { "billedTo.name": containsText(query) },
          { vehicleNo: containsText(query) },
          { transport: containsText(query) },
        ],
      };
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 }).lean();

    // Compute Customer Balances Till Date
    const customers = await Customer.find().select("name openingBalance").lean();
    const allBills = await Bill.find().select("billedTo.name grandTotal lorryFreight loadingCharges").lean();
    const allPayments = await Payment.find().select("customerName amount").lean();

    const customerBalanceMap: Record<string, number> = {};
    const customerTotalBilledMap: Record<string, number> = {};
    const customerTotalPaidMap: Record<string, number> = {};
    const customerTotalTransportMap: Record<string, number> = {};
    const customerOpeningMap: Record<string, number> = {};

    customers.forEach((c) => {
      const key = c.name.trim().toUpperCase();
      customerOpeningMap[key] = c.openingBalance || 0;
      customerBalanceMap[key] = c.openingBalance || 0;
      customerTotalBilledMap[key] = 0;
      customerTotalPaidMap[key] = 0;
      customerTotalTransportMap[key] = 0;
    });

    allBills.forEach((b) => {
      const key = (b.billedTo?.name || "").trim().toUpperCase();
      if (!key) return;
      customerTotalBilledMap[key] = (customerTotalBilledMap[key] || 0) + (b.grandTotal || 0);
      customerTotalTransportMap[key] = (customerTotalTransportMap[key] || 0) + (b.lorryFreight || 0);
    });

    allPayments.forEach((p) => {
      const key = (p.customerName || "").trim().toUpperCase();
      if (!key) return;
      customerTotalPaidMap[key] = (customerTotalPaidMap[key] || 0) + (p.amount || 0);
    });

    const allCustomerKeys = new Set([
      ...Object.keys(customerOpeningMap),
      ...Object.keys(customerTotalBilledMap),
      ...Object.keys(customerTotalPaidMap),
    ]);

    for (const key of allCustomerKeys) {
      const opening = customerOpeningMap[key] || 0;
      const billed = customerTotalBilledMap[key] || 0;
      const paid = customerTotalPaidMap[key] || 0;
      customerBalanceMap[key] = Math.max(0, round2(opening + billed - paid));
    }

    const enrichedBills = bills.map((b) => {
      const key = (b.billedTo?.name || "").trim().toUpperCase();
      const customerTillDateDue = customerBalanceMap[key] ?? Math.max(0, round2((b.grandTotal || 0) - (b.paidAmount || 0)));
      return {
        ...b,
        customerBalanceTillDate: customerTillDateDue,
        customerTotalBilled: customerTotalBilledMap[key] ?? (b.grandTotal || 0),
        customerTotalPaid: customerTotalPaidMap[key] ?? (b.paidAmount || 0),
        customerTotalTransport: customerTotalTransportMap[key] ?? (b.lorryFreight || 0),
      };
    });

    return NextResponse.json(enrichedBills);
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to fetch bills");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (!body.invoiceNo?.trim() || !body.date) {
      return NextResponse.json(
        { message: "Invoice No and Date are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    body.invoiceNo = body.invoiceNo.trim();
    body.date = toISODate(body.date);
    applyBillTotals(body);
    await assertUniqueInvoiceNo(body.invoiceNo);

    // Payment status is derived from receipts; an amount received at billing time is recorded as a receipt below.
    const requestedStatus = body.paymentStatus;
    const amountReceivedNow = Number(body.paidAmount) || 0;
    delete body.paymentStatus;
    delete body.paidAmount;
    delete body.paymentDate;

    if (body.billedTo?.name) {
      await upsertCustomer({
        name: body.billedTo.name,
        mobile: body.billedTo.mobile,
        gstin: body.billedTo.gstin,
        address: body.billedTo.address,
        deliveryPlace: body.deliveryPlace || body.station,
      });
    }

    // Company header, bank details and terms always come from Settings
    for (const field of BILL_HEADER_FIELDS) delete body[field];
    const newBill = await Bill.create({ ...body, ...(await billHeaderFromSettings()), paymentStatus: "UNPAID", paidAmount: 0 });

    const receiptAmount =
      requestedStatus === "PAID" ? newBill.grandTotal : requestedStatus === "PARTIAL" ? amountReceivedNow : 0;
    if (receiptAmount > 0) {
      await recordPayment({
        billId: newBill._id,
        customerName: newBill.billedTo?.name || "Customer",
        amount: round2(Math.min(receiptAmount, newBill.grandTotal)),
        date: newBill.date,
        paymentMode: body.paymentMode || "Cash",
        notes: "Received at billing",
      });
    }

    return NextResponse.json(await recalcBill(newBill._id), { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to create bill");
    return NextResponse.json(body, { status });
  }
}
