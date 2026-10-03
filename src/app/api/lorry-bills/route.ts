import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LorryBill } from "@/models/LorryBill";
import { getSession } from "@/lib/auth";
import { containsText, toISODate } from "@/lib/ledger";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    let filter = {};
    if (query) {
      filter = {
        $or: [
          { lorryBillNo: containsText(query) },
          { customerName: containsText(query) },
          { vehicleNo: containsText(query) },
          { material: containsText(query) },
          { deliveryPlace: containsText(query) },
        ],
      };
    }

    const lorryBills = await LorryBill.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(lorryBills);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch lorry bills" },
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
    if (body.date) body.date = toISODate(body.date);
    if (body.paymentDate) body.paymentDate = toISODate(body.paymentDate);

    if (!body.lorryBillNo || !body.date) {
      return NextResponse.json(
        { message: "Lorry Bill No and Date are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Auto-calculate amount and total
    const rate = Number(body.rate) || 0;
    const qty = Number(body.qty) || 0;
    const loadingCharges = Number(body.loadingCharges) || 0;
    const lorryFreight = Number(body.lorryFreight) || 0;
    const amount = Math.round(rate * qty * 100) / 100;
    const total = Math.round((amount + loadingCharges + lorryFreight) * 100) / 100;

    body.amount = amount;
    body.total = total;

    if (!body.paymentStatus) {
      body.paymentStatus = "UNPAID";
    }

    const newLorryBill = await LorryBill.create(body);
    return NextResponse.json(newLorryBill, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create lorry bill" },
      { status: 500 }
    );
  }
}
