import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { Vendor } from "@/models/Vendor";
import { getSession } from "@/lib/auth";
import { numberToWords } from "@/lib/utils";

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

    return NextResponse.json(purchase);
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
    body.amountInWords = numberToWords(body.grandTotal);

    // Auto-update Vendor if name provided
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

    const updated = await Purchase.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update purchase" },
      { status: 500 }
    );
  }
}

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

    const updateData: any = {};
    if (body.paymentStatus !== undefined) updateData.paymentStatus = body.paymentStatus;
    if (body.paidAmount !== undefined) updateData.paidAmount = body.paidAmount;
    if (body.paymentMode !== undefined) updateData.paymentMode = body.paymentMode;
    if (body.paymentRef !== undefined) updateData.paymentRef = body.paymentRef;
    if (body.paymentDate !== undefined) updateData.paymentDate = body.paymentDate;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const updated = await Purchase.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) {
      return NextResponse.json({ message: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to patch purchase" },
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
