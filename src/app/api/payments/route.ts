import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth";

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
      filter.date = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      filter.date = { $gte: fromDate };
    } else if (toDate) {
      filter.date = { $lte: toDate };
    }

    // Customer filter
    if (customerName) {
      filter.customerName = { $regex: `^${customerName.trim()}$`, $options: "i" };
    } else if (customerId) {
      filter.customerId = customerId;
    }

    // Bill filter
    if (billId) {
      filter.billId = billId;
    }

    // Search query
    if (query) {
      filter.$or = [
        { customerName: { $regex: query, $options: "i" } },
        { invoiceNo: { $regex: query, $options: "i" } },
        { paymentNumber: { $regex: query, $options: "i" } },
        { referenceNo: { $regex: query, $options: "i" } },
        { notes: { $regex: query, $options: "i" } },
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
    const {
      date,
      customerName,
      customerId,
      billId,
      invoiceNo,
      amount,
      paymentMode,
      referenceNo,
      notes,
    } = body;

    if (!customerName || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        { message: "Customer name and a valid positive amount are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Auto-generate payment receipt number
    const count = await Payment.countDocuments();
    const datePrefix = (date || new Date().toISOString().split("T")[0]).replace(/-/g, "");
    const paymentNumber = `RCP-${datePrefix}-${String(count + 1).padStart(4, "0")}`;

    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customerName) {
      const existingCustomer = await Customer.findOne({
        name: { $regex: `^${customerName.trim()}$`, $options: "i" },
      });
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer._id;
      }
    }

    let linkedBill = null;
    let billGrandTotal = 0;
    if (billId) {
      linkedBill = await Bill.findById(billId);
      if (linkedBill) {
        billGrandTotal = linkedBill.grandTotal || 0;
      }
    }

    const newPayment = await Payment.create({
      paymentNumber,
      date: date || new Date().toISOString().split("T")[0],
      customerId: resolvedCustomerId || undefined,
      customerName: customerName.trim(),
      billId: billId || undefined,
      invoiceNo: invoiceNo || (linkedBill ? linkedBill.invoiceNo : ""),
      billGrandTotal,
      amount: Number(amount),
      paymentMode: paymentMode || "Cash",
      referenceNo: referenceNo || "",
      notes: notes || "",
    });

    // If payment is linked to a bill, automatically update the bill's paidAmount & paymentStatus
    if (billId && linkedBill) {
      const allBillPayments = await Payment.find({ billId });
      const totalPaidForBill = allBillPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      let newStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
      if (totalPaidForBill >= linkedBill.grandTotal) {
        newStatus = "PAID";
      } else if (totalPaidForBill > 0) {
        newStatus = "PARTIAL";
      }

      await Bill.findByIdAndUpdate(billId, {
        $set: {
          paidAmount: totalPaidForBill,
          paymentStatus: newStatus,
          paymentDate: date || linkedBill.date,
        },
      });
    }

    return NextResponse.json(newPayment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}
