import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { getSession } from "@/lib/auth";
import { LedgerError, errorResponse } from "@/lib/ledger";
import { MANUAL_STATUSES, assertUniqueQuotationNo, buildQuotationFields, displayStatus } from "@/lib/quotations";

async function loadQuotation(id: string) {
  if (!mongoose.isValidObjectId(id)) throw new LedgerError("Quotation not found", 404);
  const quotation = await Quotation.findById(id);
  if (!quotation) throw new LedgerError("Quotation not found", 404);
  return quotation;
}

const withStatus = (q: any) => ({ ...q.toObject(), displayStatus: displayStatus(q) });

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
    return NextResponse.json(withStatus(await loadQuotation(id)));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to fetch quotation");
    return NextResponse.json(body, { status });
  }
}

/** Edit the quotation. Converted quotations are locked (the bill is the record now). */
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

    const quotation = await loadQuotation(id);
    if (quotation.status === "CONVERTED") {
      throw new LedgerError(`This quotation was converted to invoice ${quotation.convertedInvoiceNo} and can no longer be edited`, 409);
    }

    const fields = buildQuotationFields(body);
    await assertUniqueQuotationNo(fields.quotationNo, id);
    quotation.set(fields);
    await quotation.save();
    return NextResponse.json(withStatus(quotation));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to update quotation");
    return NextResponse.json(body, { status });
  }
}

/** PATCH { status: "OPEN" | "ACCEPTED" | "REJECTED" } */
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

    const quotation = await loadQuotation(id);
    if (!MANUAL_STATUSES.includes(body.status)) {
      throw new LedgerError("Status must be OPEN, ACCEPTED or REJECTED");
    }
    if (quotation.status === "CONVERTED") {
      throw new LedgerError(`This quotation was already converted to invoice ${quotation.convertedInvoiceNo}`, 409);
    }
    quotation.status = body.status;
    await quotation.save();
    return NextResponse.json(withStatus(quotation));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to update quotation status");
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

    const quotation = await loadQuotation(id);
    if (quotation.status === "CONVERTED") {
      throw new LedgerError(`This quotation was converted to invoice ${quotation.convertedInvoiceNo} and is kept for reference`, 409);
    }
    await quotation.deleteOne();
    return NextResponse.json({ message: "Quotation deleted successfully" });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to delete quotation");
    return NextResponse.json(body, { status });
  }
}
