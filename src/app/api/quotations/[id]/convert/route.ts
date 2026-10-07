import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { getSession } from "@/lib/auth";
import { errorResponse } from "@/lib/ledger";
import { convertQuotationToBill } from "@/lib/quotations";

/** Turn a quotation into a sales bill. Body (optional): { invoiceNo, date, vehicleNo } */
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
    const body = await req.json().catch(() => ({}));
    await connectToDatabase();

    const quotation = mongoose.isValidObjectId(id) ? await Quotation.findById(id) : null;
    if (!quotation) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }

    const bill = await convertQuotationToBill(quotation, body || {});
    return NextResponse.json({ bill, quotationId: quotation._id }, { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to convert quotation");
    return NextResponse.json(body, { status });
  }
}
