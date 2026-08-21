import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CompanySettings } from "@/models/CompanySettings";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    await connectToDatabase();
    let settings = await CompanySettings.findOne();
    if (!settings) {
      settings = await CompanySettings.create({
        companyName: "",
        companyGstin: "",
        companyAddress: "",
        companyMobile: "",
        documentTitle: "BILL OF SUPPLY",
        copyLabel: "Original Copy",
        bankAccountName: "",
        bankAccountNumber: "",
        bankIfsc: "",
        bankBranch: "",
        termsAndConditions: [],
        authorisedSignatoryText: "",
      });
    }
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();

    let settings = await CompanySettings.findOne();
    if (settings) {
      settings = await CompanySettings.findByIdAndUpdate(settings._id, body, {
        new: true,
      });
    } else {
      settings = await CompanySettings.create(body);
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
