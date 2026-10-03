import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { Payment } from "@/models/Payment";
import { getSession } from "@/lib/auth";
import {
  assertUniqueInvoiceNo,
  errorResponse,
  recalcBill,
  recordPayment,
  round2,
  sumBillPayments,
  toISODate,
  todayISO,
  upsertCustomer,
} from "@/lib/ledger";

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

    const bill = await Bill.findById(id);
    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to fetch bill");
    return NextResponse.json(body, { status });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    await connectToDatabase();

    // Payments are managed as receipts; an edit form must never overwrite them.
    delete body.paymentStatus;
    delete body.paidAmount;
    delete body.paymentDate;
    delete body._id;

    if (body.date) body.date = toISODate(body.date);
    if (body.invoiceNo !== undefined) {
      body.invoiceNo = String(body.invoiceNo).trim();
      if (!body.invoiceNo) {
        return NextResponse.json({ message: "Invoice No is required" }, { status: 400 });
      }
      await assertUniqueInvoiceNo(body.invoiceNo, id);
    }

    if (body.billedTo?.name) {
      await upsertCustomer({
        name: body.billedTo.name,
        mobile: body.billedTo.mobile,
        gstin: body.billedTo.gstin,
        address: body.billedTo.address,
        deliveryPlace: body.deliveryPlace || body.station,
      });
    }

    const updatedBill = await Bill.findByIdAndUpdate(id, body, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!updatedBill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    // Total may have changed: re-derive PAID / PARTIAL / UNPAID from the receipts.
    return NextResponse.json(await recalcBill(updatedBill._id));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to update bill");
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH { markPaid: true, paymentMode?, date?, referenceNo? }
 * Records a receipt for the remaining balance ("Mark Paid" buttons).
 * Payment status can no longer be set directly — it always follows the receipts.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    await connectToDatabase();

    const bill = await Bill.findById(id);
    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    if (body.paymentNotes !== undefined) {
      bill.paymentNotes = body.paymentNotes;
      await bill.save();
    }

    if (body.markPaid) {
      const balance = round2((bill.grandTotal || 0) - (await sumBillPayments(bill._id)));
      if (balance <= 0) {
        return NextResponse.json({ message: "This bill is already fully paid" }, { status: 400 });
      }
      await recordPayment({
        billId: bill._id,
        customerName: bill.billedTo?.name || "Customer",
        amount: balance,
        date: body.date || todayISO(),
        paymentMode: body.paymentMode || "Cash",
        referenceNo: body.referenceNo || "",
        notes: "Marked as paid (full balance)",
      });
    }

    return NextResponse.json(await recalcBill(bill._id));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to update payment status");
    return NextResponse.json(body, { status });
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

    const receipts = await Payment.find({ billId: id }).select("amount").lean();
    if (receipts.length) {
      const total = round2(receipts.reduce((s, r) => s + (r.amount || 0), 0));
      return NextResponse.json(
        {
          message: `This bill has ${receipts.length} payment receipt(s) totalling ₹${total}. Delete those receipts from the bill page first.`,
        },
        { status: 409 }
      );
    }

    const deletedBill = await Bill.findByIdAndDelete(id);
    if (!deletedBill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to delete bill");
    return NextResponse.json(body, { status });
  }
}
