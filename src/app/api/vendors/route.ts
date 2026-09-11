import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    let filter: any = {};
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: "i" } },
          { mobile: { $regex: query, $options: "i" } },
          { gstin: { $regex: query, $options: "i" } },
          { quarryLocation: { $regex: query, $options: "i" } },
        ],
      };
    }

    const vendors = await Vendor.find(filter).sort({ name: 1 }).lean();

    // Attach purchase aggregates per vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (v) => {
        const purchases = await Purchase.find({
          $or: [
            { vendorId: v._id },
            { vendorName: { $regex: `^${v.name.trim()}$`, $options: "i" } },
          ],
        }).select("grandTotal paidAmount paymentStatus qty").lean();

        const totalPurchases = purchases.length;
        const totalAmount = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
        const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const totalPending = purchases
          .filter((p) => p.paymentStatus === "UNPAID" || p.paymentStatus === "PARTIAL")
          .reduce((sum, p) => sum + Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0)), 0);
        const totalTonnage = purchases.reduce((sum, p) => sum + (p.qty || 0), 0);

        return {
          ...v,
          totalPurchases,
          totalAmount,
          totalPaid,
          totalPending,
          totalTonnage,
        };
      })
    );

    return NextResponse.json(vendorsWithStats);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch vendors" },
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
    if (!body.name) {
      return NextResponse.json({ message: "Vendor Name is required" }, { status: 400 });
    }

    await connectToDatabase();

    const nameTrim = body.name.trim();
    let vendor = await Vendor.findOne({
      name: { $regex: `^${nameTrim}$`, $options: "i" },
    });

    if (vendor) {
      vendor = await Vendor.findByIdAndUpdate(vendor._id, body, { new: true });
    } else {
      vendor = await Vendor.create(body);
    }

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create vendor" },
      { status: 500 }
    );
  }
}
