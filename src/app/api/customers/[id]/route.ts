import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
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

    const customer = await Customer.findById(id);
    if (!customer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch customer" },
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

    const updatedCustomer = await Customer.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updatedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedCustomer);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update customer" },
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

    const deletedCustomer = await Customer.findByIdAndDelete(id);
    if (!deletedCustomer) {
      return NextResponse.json(
        { message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Customer deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to delete customer" },
      { status: 500 }
    );
  }
}
