import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";
import { purchaseSales, soldStatus, tradeMargin } from "@/lib/sourcing";
import { LedgerError, errorResponse, round2, toISODate } from "@/lib/ledger";
import { DERIVED_PAYMENT_FIELDS, addPurchasePayment, assertUniqueInwardNo, computePurchaseTotals, linkVendor, syncPurchasePayments } from "@/lib/purchases";

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

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ message: "Purchase entry not found" }, { status: 404 });
    }

    const summary = (await purchaseSales([purchase._id])).get(String(purchase._id));
    const status = soldStatus(purchase, summary);
    // Trade margin on what has been sold, with the income / cost of each invoice
    const { sales, ...trade } = tradeMargin(purchase, summary);
    return NextResponse.json({ ...purchase.toObject(), ...status, sales, trade });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch purchase" },
      { status: 500 }
    );
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

    const purchase = await Purchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    // Payments are managed through the payment history, never by the edit form
    for (const field of DERIVED_PAYMENT_FIELDS) delete body[field];
    delete body._id;

    if (body.date) body.date = toISODate(body.date);
    if (body.inwardNo !== undefined) {
      body.inwardNo = String(body.inwardNo).trim();
      if (!body.inwardNo) throw new LedgerError("Inward No is required");
      await assertUniqueInwardNo(body.inwardNo, id);
    }
    Object.assign(body, computePurchaseTotals({ ...purchase.toObject(), ...body }));
    // A load already sold on bills cannot shrink below the sold quantity or change unit
    const sold = soldStatus(purchase, (await purchaseSales([purchase._id])).get(String(purchase._id)));
    if (sold.soldQty > 0) {
      if (body.qty + 0.005 < sold.soldQty) {
        throw new LedgerError(`${sold.soldQty} ${purchase.unit} of this load is already sold, so the quantity cannot be less than that`);
      }
      if (body.unit && body.unit !== purchase.unit) {
        throw new LedgerError(`This load is already sold in ${purchase.unit}, so the unit cannot be changed`);
      }
    }
    if (body.vendorName) body.vendorId = await linkVendor(body);

    purchase.set(body);
    // The total may have changed: re-derive PAID / PARTIAL / UNPAID
    syncPurchasePayments(purchase);
    await purchase.save();

    return NextResponse.json(purchase);
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to update purchase");
    return NextResponse.json(body, { status });
  }
}

/**
 * PATCH { markPaid: true, mode?, date?, ref? } pays the remaining balance as one installment.
 * PATCH { notes } updates the remarks. Paid amount / status cannot be set directly.
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

    let purchase = await Purchase.findById(id);
    if (!purchase) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    if (body.notes !== undefined) {
      purchase.notes = body.notes;
      await purchase.save();
    }

    if (body.markPaid) {
      const balance = round2((purchase.grandTotal || 0) - (purchase.paidAmount || 0));
      if (balance <= 0) throw new LedgerError("This purchase is already fully paid");
      purchase = await addPurchasePayment(id, {
        amount: balance,
        date: body.date,
        mode: body.mode || "Cash",
        ref: body.ref,
        notes: "Marked as paid (full balance)",
      });
    }

    return NextResponse.json(purchase);
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to patch purchase");
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

    const sold = (await purchaseSales([id])).get(String(id));
    if (sold?.soldQty) {
      const invoices = [...new Set(sold.sales.map((s) => s.invoiceNo))].join(", ");
      return NextResponse.json(
        { message: `This load is sold on invoice ${invoices}. Remove it from those bills before deleting the purchase.` },
        { status: 409 }
      );
    }

    const deleted = await Purchase.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Purchase deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete purchase" },
      { status: 500 }
    );
  }
}
