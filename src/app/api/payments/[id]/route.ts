import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
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
    await connectToDatabase();

    const payment = await Payment.findById(id);
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json(payment);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await connectToDatabase();

    const payment = await Payment.findByIdAndDelete(id);
    if (!payment) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }

    // If payment was linked to a bill, recalculate the bill's paidAmount & paymentStatus
    if (payment.billId) {
      const bill = await Bill.findById(payment.billId);
      if (bill) {
        const remainingPayments = await Payment.find({ billId: payment.billId });
        const totalPaid = remainingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

        let newStatus: "UNPAID" | "PARTIAL" | "PAID" = "UNPAID";
        if (totalPaid >= bill.grandTotal) {
          newStatus = "PAID";
        } else if (totalPaid > 0) {
          newStatus = "PARTIAL";
        }

        await Bill.findByIdAndUpdate(payment.billId, {
          $set: {
            paidAmount: totalPaid,
            paymentStatus: newStatus,
          },
        });
      }
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete payment" },
      { status: 500 }
    );
  }
}
