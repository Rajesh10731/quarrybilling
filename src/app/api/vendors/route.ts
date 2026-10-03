import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Purchase } from "@/models/Purchase";
import { getSession } from "@/lib/auth";
import { containsText, upsertVendor } from "@/lib/ledger";
import { vendorPurchaseFilter, vendorSummary } from "@/lib/purchases";

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
          { name: containsText(query) },
          { mobile: containsText(query) },
          { gstin: containsText(query) },
          { quarryLocation: containsText(query) },
        ],
      };
    }

    const vendors = await Vendor.find(filter).sort({ name: 1 }).lean();

    // Attach purchase aggregates per vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (v) => {
        const purchases = await Purchase.find(vendorPurchaseFilter(v)).select("grandTotal paidAmount qty").lean();
        const summary = vendorSummary(v.openingBalance, purchases);
        return {
          ...v,
          totalPurchases: summary.totalPurchases,
          totalAmount: summary.totalAmount,
          totalPaid: summary.totalPaid,
          totalPending: summary.pendingBalance,
          totalTonnage: summary.totalTonnage,
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

    // Upsert by exact name; blank fields never erase details already saved.
    // The add form always sends opening balance 0, so only a real value may change it.
    const vendor = await upsertVendor({ ...body, openingBalance: Number(body.openingBalance) ? Number(body.openingBalance) : undefined });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create vendor" },
      { status: 500 }
    );
  }
}
