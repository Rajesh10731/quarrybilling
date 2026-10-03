import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";
import { exactName } from "@/lib/ledger";
import { vendorPurchaseFilter, vendorSummary } from "@/lib/purchases";

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

    const vendor = await Vendor.findById(id).lean();
    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    const purchases = await Purchase.find(vendorPurchaseFilter(vendor)).sort({ date: -1, createdAt: -1 });
    const summary = vendorSummary(vendor.openingBalance, purchases);

    return NextResponse.json({
      vendor,
      purchases,
      summary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch vendor statement" },
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

    if (body.name !== undefined) {
      body.name = String(body.name).trim();
      if (!body.name) return NextResponse.json({ message: "Vendor Name is required" }, { status: 400 });
      const dup = await Vendor.findOne({ _id: { $ne: id }, name: exactName(body.name) }).select("_id").lean();
      if (dup) return NextResponse.json({ message: `Another vendor is already named "${body.name}"` }, { status: 409 });
    }

    const existing = await Vendor.findById(id);
    if (!existing) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }
    // Keep old entries linked when the vendor is renamed
    if (body.name && body.name !== existing.name) {
      await Purchase.updateMany({ vendorName: exactName(existing.name), $or: [{ vendorId: { $exists: false } }, { vendorId: null }] }, { $set: { vendorId: existing._id } });
      await Purchase.updateMany({ vendorId: existing._id }, { $set: { vendorName: body.name } });
    }

    const updated = await Vendor.findByIdAndUpdate(id, body, { returnDocument: "after", runValidators: true });
    if (!updated) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update vendor" },
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

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }
    const purchaseCount = await Purchase.countDocuments(vendorPurchaseFilter(vendor));
    if (purchaseCount) {
      return NextResponse.json(
        { message: `Cannot delete ${vendor.name}: they have ${purchaseCount} purchase entr${purchaseCount === 1 ? "y" : "ies"}. Delete those first.` },
        { status: 409 }
      );
    }

    const deleted = await Vendor.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vendor deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
