import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth";
import { containsText, upsertCustomer } from "@/lib/ledger";

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
          { name: containsText(query) },
          { mobile: containsText(query) },
          { gstin: containsText(query) },
          { deliveryPlace: containsText(query) },
        ],
      };
    }

    const customers = await Customer.find(filter).sort({ name: 1 });
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch customers" },
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
      return NextResponse.json(
        { message: "Customer Name is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Upsert by exact name; blank fields never erase details already saved
    const customer = await upsertCustomer({
      name: body.name,
      mobile: body.mobile,
      gstin: body.gstin,
      address: body.address,
      deliveryPlace: body.deliveryPlace,
      // The add form always sends 0 by default; only a real value may change a saved opening balance
      openingBalance: Number(body.openingBalance) ? Number(body.openingBalance) : undefined,
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to save customer" },
      { status: 500 }
    );
  }
}
