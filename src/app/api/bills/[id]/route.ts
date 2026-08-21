import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { getSession } from "@/lib/auth";

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

    const bill = await Bill.findById(id);
    if (!bill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(bill);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch bill" },
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

    // Auto store/update customer details if billedTo name is present
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

    const updatedBill = await Bill.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedBill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(updatedBill);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update bill" },
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

    const updateFields: any = {};
    if (body.paymentStatus !== undefined) updateFields.paymentStatus = body.paymentStatus;
    if (body.paidAmount !== undefined) updateFields.paidAmount = body.paidAmount;
    if (body.paymentDate !== undefined) updateFields.paymentDate = body.paymentDate;
    if (body.paymentNotes !== undefined) updateFields.paymentNotes = body.paymentNotes;

    const updatedBill = await Bill.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
    if (!updatedBill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(updatedBill);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update payment status" },
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

    const deletedBill = await Bill.findByIdAndDelete(id);
    if (!deletedBill) {
      return NextResponse.json({ message: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Bill deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete bill" },
      { status: 500 }
    );
  }
}
