import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";
import { LedgerError, containsText, errorResponse, round2, toISODate } from "@/lib/ledger";
import { DERIVED_PAYMENT_FIELDS, assertUniqueInwardNo, computePurchaseTotals, linkVendor, syncPurchasePayments } from "@/lib/purchases";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const status = searchParams.get("status") || "ALL";
    const vendorId = searchParams.get("vendorId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    await connectToDatabase();

    const filter: any = {};

    if (query) {
      filter.$or = [
        { inwardNo: containsText(query) },
        { vendorName: containsText(query) },
        { vehicleNo: containsText(query) },
        { transportName: containsText(query) },
        { material: containsText(query) },
        { driverName: containsText(query) },
      ];
    }

    if (status && status !== "ALL") {
      filter.paymentStatus = status;
    }

    if (vendorId) {
      filter.vendorId = vendorId;
    }

    if (fromDate || toDate) {
      filter.date = {};
      if (fromDate) filter.date.$gte = toISODate(fromDate);
      if (toDate) filter.date.$lte = toISODate(toDate);
    }

    const purchases = await Purchase.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(purchases);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch purchases" },
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

    if (!body.inwardNo?.trim() || !body.date || !body.vendorName?.trim() || !body.vehicleNo?.trim()) {
      return NextResponse.json(
        { message: "Inward No, Date, Vendor Name, and Vehicle No are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    body.inwardNo = body.inwardNo.trim();
    body.date = toISODate(body.date);
    Object.assign(body, computePurchaseTotals(body));
    await assertUniqueInwardNo(body.inwardNo);

    // What was paid at entry becomes the first installment; status is derived from it.
    // Selecting PAID means the full amount; otherwise the typed paid amount is used.
    const paidNow = round2(body.paymentStatus === "PAID" ? body.grandTotal : Number(body.paidAmount) || 0);
    if (paidNow < 0) throw new LedgerError("Paid amount cannot be negative");
    if (paidNow > body.grandTotal + 0.005) {
      throw new LedgerError(`Paid amount ₹${paidNow} is more than the purchase total ₹${body.grandTotal}`);
    }
    const firstPayment =
      paidNow > 0
        ? [{ amount: paidNow, date: toISODate(body.paymentDate) || body.date, mode: body.paymentMode || "Cash", ref: body.paymentRef || "", notes: "Paid at entry" }]
        : [];
    for (const field of DERIVED_PAYMENT_FIELDS) delete body[field];

    body.vendorId = await linkVendor(body);

    const newPurchase = new Purchase({ ...body, payments: firstPayment });
    syncPurchasePayments(newPurchase);
    await newPurchase.save();
    return NextResponse.json(newPurchase, { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to create purchase entry");
    return NextResponse.json(body, { status });
  }
}
