import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth";

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
          { name: { $regex: query, $options: "i" } },
          { mobile: { $regex: query, $options: "i" } },
          { gstin: { $regex: query, $options: "i" } },
          { deliveryPlace: { $regex: query, $options: "i" } },
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

    // Upsert customer by name
    let customer = await Customer.findOne({
      name: { $regex: `^${body.name.trim()}$`, $options: "i" },
    });

    if (customer) {
      customer = await Customer.findByIdAndUpdate(customer._id, body, {
        new: true,
      });
    } else {
      customer = await Customer.create(body);
    }

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to save customer" },
      { status: 500 }
    );
  }
}
