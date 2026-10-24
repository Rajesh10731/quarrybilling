import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Quotation } from "@/models/Quotation";
import { getSession } from "@/lib/auth";
import { containsText, errorResponse } from "@/lib/ledger";
import {
  assertUniqueQuotationNo,
  buildQuotationFields,
  companySnapshot,
  displayStatus,
  suggestNextQuotationNo,
} from "@/lib/quotations";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    if (searchParams.get("nextQuotationNo")) {
      return NextResponse.json({ quotationNo: await suggestNextQuotationNo(searchParams.get("date") || undefined) });
    }

    const filter = query
      ? {
          $or: [
            { quotationNo: containsText(query) },
            { "customer.name": containsText(query) },
            { deliveryPlace: containsText(query) },
            { "items.description": containsText(query) },
          ],
        }
      : {};

    const quotations = await Quotation.find(filter).sort({ createdAt: -1 }).lean();
    return NextResponse.json(quotations.map((q) => ({ ...q, displayStatus: displayStatus(q) })));
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to fetch quotations");
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    const fields = buildQuotationFields(body);
    await assertUniqueQuotationNo(fields.quotationNo);

    const quotation = await Quotation.create({
      ...(await companySnapshot()),
      ...fields,
      status: "OPEN",
    });
    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    const { body, status } = errorResponse(error, "Failed to create quotation");
    return NextResponse.json(body, { status });
  }
}
