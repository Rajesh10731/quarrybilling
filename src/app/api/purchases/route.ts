import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { Vendor } from "@/models/Vendor";
import { getSession } from "@/lib/auth";
import { numberToWords } from "@/lib/utils";

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
        { inwardNo: { $regex: query, $options: "i" } },
        { vendorName: { $regex: query, $options: "i" } },
        { vehicleNo: { $regex: query, $options: "i" } },
        { transportName: { $regex: query, $options: "i" } },
        { material: { $regex: query, $options: "i" } },
        { driverName: { $regex: query, $options: "i" } },
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
      if (fromDate) filter.date.$gte = fromDate;
      if (toDate) filter.date.$lte = toDate;
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

    if (!body.inwardNo || !body.date || !body.vendorName || !body.vehicleNo) {
      return NextResponse.json(
        { message: "Inward No, Date, Vendor Name, and Vehicle No are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Auto-calculate financial numbers if not provided
    const qty = Number(body.qty) || 0;
    const rate = Number(body.rate) || 0;
    const materialAmount = Number(body.materialAmount) || qty * rate;
    const lorryFreight = Number(body.lorryFreight) || 0;
    const loadingCharges = Number(body.loadingCharges) || 0;
    const taxAmount = Number(body.taxAmount) || 0;
    const otherCharges = Number(body.otherCharges) || 0;

    const grandTotal =
      Number(body.grandTotal) ||
      materialAmount + (body.freightPaidBy === "Paid by Us" ? lorryFreight : 0) + loadingCharges + taxAmount + otherCharges;

    body.materialAmount = materialAmount;
    body.grandTotal = Math.round(grandTotal * 100) / 100;
    if (!body.amountInWords || body.amountInWords === "Rupees Zero Only") {
      body.amountInWords = numberToWords(body.grandTotal);
    }

    if (!body.paymentStatus) {
      body.paymentStatus = "UNPAID";
    }

    // Auto-register or update Vendor details
    if (body.vendorName) {
      const vendorNameTrim = body.vendorName.trim();
      const vendorData = {
        name: vendorNameTrim,
        mobile: body.vendorMobile || "",
        gstin: body.vendorGstin || "",
        address: body.vendorAddress || "",
        quarryLocation: body.unloadingPoint || body.quarryLocation || "",
      };

      let existingVendor = await Vendor.findOne({
        name: { $regex: `^${vendorNameTrim}$`, $options: "i" },
      });

      if (existingVendor) {
        existingVendor = await Vendor.findByIdAndUpdate(existingVendor._id, vendorData, { new: true });
        body.vendorId = existingVendor!._id;
      } else {
        const newVendor = await Vendor.create(vendorData);
        body.vendorId = newVendor._id;
      }
    }

    const newPurchase = await Purchase.create(body);
    return NextResponse.json(newPurchase, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create purchase entry" },
      { status: 500 }
    );
  }
}
