import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { getSession } from "@/lib/auth";
import { containsText, errorResponse, exactName, recordPayment, toISODate } from "@/lib/ledger";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const customerName = searchParams.get("customerName") || "";
    const customerId = searchParams.get("customerId") || "";
    const billId = searchParams.get("billId") || "";
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    const filter: any = {};

    // Date range filter
    if (fromDate && toDate) {
      filter.date = { $gte: toISODate(fromDate), $lte: toISODate(toDate) };
    } else if (fromDate) {
      filter.date = { $gte: toISODate(fromDate) };
    } else if (toDate) {
      filter.date = { $lte: toISODate(toDate) };
    }

    // Customer filter
    if (customerName) {
      filter.customerName = exactName(customerName);
    } else if (customerId) {
      filter.customerId = customerId;
    }

    // Bill filter
    if (billId) {
      // A malformed bill id simply has no payments
      if (!mongoose.isValidObjectId(billId)) {
        return NextResponse.json({ payments: [], summary: { totalCollected: 0, transactionCount: 0 } });
      }
      filter.billId = billId;
    }

    // Search query
    if (query) {
      filter.$or = [
        { customerName: containsText(query) },
        { invoiceNo: containsText(query) },
        { paymentNumber: containsText(query) },
        { referenceNo: containsText(query) },
        { notes: containsText(query) },
      ];
    }

    const payments = await Payment.find(filter).sort({ date: -1, createdAt: -1 });

    // Aggregate metrics for report
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      payments,
      summary: {
        totalCollected,
        transactionCount: payments.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    // Validates amount, blocks overpaying the bill, numbers the receipt and updates the bill status
    const newPayment = await recordPayment({
      date: body.date,
      customerName: body.customerName,
      customerId: body.customerId || undefined,
      billId: body.billId || undefined,
      invoiceNo: body.invoiceNo,
      amount: Number(body.amount),
      paymentMode: body.paymentMode,
      referenceNo: body.referenceNo,
      notes: body.notes,
    });

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to record payment");
    return NextResponse.json(body, { status });
  }
}
