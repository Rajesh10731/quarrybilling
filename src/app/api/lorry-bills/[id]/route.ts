import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { LorryBill } from "@/models/LorryBill";
import { getSession } from "@/lib/auth";
import { toISODate } from "@/lib/ledger";

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
    const lorryBill = await LorryBill.findById(id);
    if (!lorryBill) {
      return NextResponse.json({ message: "Lorry bill not found" }, { status: 404 });
    }
    return NextResponse.json(lorryBill);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch lorry bill" },
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
    if (body.date) body.date = toISODate(body.date);
    if (body.paymentDate) body.paymentDate = toISODate(body.paymentDate);
    await connectToDatabase();

    // Recalculate on update
    const rate = Number(body.rate) || 0;
    const qty = Number(body.qty) || 0;
    const loadingCharges = Number(body.loadingCharges) || 0;
    const lorryFreight = Number(body.lorryFreight) || 0;
    body.amount = Math.round(rate * qty * 100) / 100;
    body.total = Math.round((body.amount + loadingCharges + lorryFreight) * 100) / 100;

    const updated = await LorryBill.findByIdAndUpdate(id, body, { returnDocument: "after" });
    if (!updated) {
      return NextResponse.json({ message: "Lorry bill not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update lorry bill" },
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
    const updated = await LorryBill.findByIdAndUpdate(id, { $set: body }, { returnDocument: "after" });
    if (!updated) {
      return NextResponse.json({ message: "Lorry bill not found" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to patch lorry bill" },
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
    await LorryBill.findByIdAndDelete(id);
    return NextResponse.json({ message: "Lorry bill deleted" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete lorry bill" },
      { status: 500 }
    );
  }
}
