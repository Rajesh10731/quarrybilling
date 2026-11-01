import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { CompanySettings } from "@/models/CompanySettings";
import { getSession } from "@/lib/auth";
import { containsText, round2, toISODate } from "@/lib/ledger";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = toISODate(searchParams.get("fromDate"));
    const toDate = toISODate(searchParams.get("toDate"));
    const vendorName = searchParams.get("vendorName") || "";
    const query = searchParams.get("query") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";

    await connectToDatabase();

    // Build filter
    const filter: any = {};

    if (fromDate && toDate) {
      filter.date = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      filter.date = { $gte: fromDate };
    } else if (toDate) {
      filter.date = { $lte: toDate };
    }

    if (vendorName) {
      filter.vendorName = { $regex: new RegExp(`^${vendorName}$`, "i") };
    }

    if (paymentStatus && paymentStatus !== "ALL") {
      filter.paymentStatus = paymentStatus;
    }

    if (query) {
      filter.$or = [
        { inwardNo: containsText(query) },
        { vendorName: containsText(query) },
        { vehicleNo: containsText(query) },
        { material: containsText(query) },
        { transportName: containsText(query) },
      ];
    }

    const purchases = await Purchase.find(filter).sort({ date: -1, createdAt: -1 }).lean();

    // Get all unique vendor names for the dropdown
    const allVendors = await Purchase.distinct("vendorName");

    // Compute per-row data with freight separated
    const rows = purchases.map((p: any) => ({
      _id: p._id,
      inwardNo: p.inwardNo,
      date: p.date,
      vendorName: p.vendorName,
      vehicleNo: p.vehicleNo,
      transportName: p.transportName || "",
      driverName: p.driverName || "",
      material: p.material,
      qty: p.qty || 0,
      unit: p.unit || "Tonne",
      rate: p.rate || 0,
      // Separated amounts
      materialAmount: round2(p.materialAmount || 0),
      lorryFreight: round2(p.lorryFreight || 0),
      freightPaidBy: p.freightPaidBy || "Paid by Us",
      loadingCharges: round2(p.loadingCharges || 0),
      taxAmount: round2(p.taxAmount || 0),
      otherCharges: round2(p.otherCharges || 0),
      grandTotal: round2(p.grandTotal || 0),
      // Payment
      paymentStatus: p.paymentStatus || "UNPAID",
      paidAmount: round2(p.paidAmount || 0),
      pendingAmount: round2(Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0))),
    }));

    // KPI Summary — freight always separated
    const totalLoads = rows.length;
    const totalQty = round2(rows.reduce((s, r) => s + r.qty, 0));
    const totalMaterialAmount = round2(rows.reduce((s, r) => s + r.materialAmount, 0));
    const totalLorryFreight = round2(rows.reduce((s, r) => s + r.lorryFreight, 0));
    const totalLoadingCharges = round2(rows.reduce((s, r) => s + r.loadingCharges, 0));
    const totalOtherCharges = round2(rows.reduce((s, r) => s + r.otherCharges, 0));
    const totalTaxAmount = round2(rows.reduce((s, r) => s + r.taxAmount, 0));
    const totalGrandTotal = round2(rows.reduce((s, r) => s + r.grandTotal, 0));
    const totalPaid = round2(rows.reduce((s, r) => s + r.paidAmount, 0));
    const totalPending = round2(rows.reduce((s, r) => s + r.pendingAmount, 0));

    const company = (await CompanySettings.findOne()) || {
      companyName: "QUARRY BILLING",
      companyGstin: "",
      companyAddress: "",
      companyMobile: "",
    };

    return NextResponse.json({
      rows,
      kpi: {
        totalLoads,
        totalQty,
        totalMaterialAmount,
        totalLorryFreight,
        totalLoadingCharges,
        totalOtherCharges,
        totalTaxAmount,
        totalGrandTotal,
        totalPaid,
        totalPending,
      },
      vendors: allVendors.sort(),
      company,
      period: {
        fromDate: fromDate || "All Time",
        toDate: toDate || "All Time",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to generate purchase report" },
      { status: 500 }
    );
  }
}

