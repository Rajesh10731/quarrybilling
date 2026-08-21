import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
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
          { invoiceNo: { $regex: query, $options: "i" } },
          { "billedTo.name": { $regex: query, $options: "i" } },
          { vehicleNo: { $regex: query, $options: "i" } },
          { transport: { $regex: query, $options: "i" } },
        ],
      };
    }

    const bills = await Bill.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(bills);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch bills" },
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

    if (!body.invoiceNo || !body.date) {
      return NextResponse.json(
        { message: "Invoice No and Date are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Default payment status to UNPAID (do NOT mark as paid upon creation)
    if (!body.paymentStatus) {
      body.paymentStatus = "UNPAID";
    }

    // Automatically store customer details in Customer database
    if (body.billedTo?.name) {
      const custName = body.billedTo.name.trim();
      const custData = {
        name: custName,
        mobile: body.billedTo.mobile || "",
        gstin: body.billedTo.gstin || "",
        address: body.billedTo.address || "",
        deliveryPlace: body.deliveryPlace || body.station || "",
      };
      
      const existingCustomer = await Customer.findOne({
        name: { $regex: `^${custName}$`, $options: "i" },
      });

      if (existingCustomer) {
        await Customer.findByIdAndUpdate(existingCustomer._id, custData);
      } else {
        await Customer.create(custData);
      }
    }

    const newBill = await Bill.create(body);
    return NextResponse.json(newBill, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to create bill" },
      { status: 500 }
    );
  }
}
