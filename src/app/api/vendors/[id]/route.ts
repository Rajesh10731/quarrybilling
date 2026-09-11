import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Purchase } from "@/models/Purchase";
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

    const vendor = await Vendor.findById(id).lean();
    if (!vendor) {
      return NextResponse.json({ message: "Vendor not found" }, { status: 404 });
    }

    const purchases = await Purchase.find({
      $or: [
        { vendorId: vendor._id },
        { vendorName: { $regex: `^${vendor.name.trim()}$`, $options: "i" } },
      ],
    }).sort({ date: -1, createdAt: -1 });

    const totalPurchases = purchases.length;
    const totalAmount = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const pendingBalance = purchases
      .filter((p) => p.paymentStatus === "UNPAID" || p.paymentStatus === "PARTIAL")
      .reduce((sum, p) => sum + Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0)), 0);

    return NextResponse.json({
      vendor,
      purchases,
      summary: {
        totalPurchases,
        totalAmount,
        totalPaid,
        pendingBalance,
      },
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

    const updated = await Vendor.findByIdAndUpdate(id, body, { new: true });
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
