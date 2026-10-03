import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/ledger";
import { addPurchasePayment, syncPurchasePayments } from "@/lib/purchases";

/** Record one payment installment to the vendor for this purchase. */
export async function POST(
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

    const purchase = await addPurchasePayment(id, {
      amount: body.amount,
      date: body.date,
      mode: body.mode,
      ref: body.ref,
      notes: body.notes,
    });
    return NextResponse.json(purchase, { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to record payment");
    return NextResponse.json(body, { status });
  }
}

/** Remove a wrongly entered installment: DELETE /api/purchases/{id}/payments?paymentId=... */
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
    const paymentId = new URL(req.url).searchParams.get("paymentId");
    await connectToDatabase();

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }
    const before = purchase.payments.length;
    purchase.payments = purchase.payments.filter((p) => String(p._id) !== paymentId);
    if (purchase.payments.length === before) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }
    syncPurchasePayments(purchase);
    await purchase.save();
    return NextResponse.json(purchase);
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to delete payment");
    return NextResponse.json(body, { status });
  }
}
