import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { CompanySettings } from "@/models/CompanySettings";
import { Customer } from "@/models/Customer";
import { Bill } from "@/models/Bill";

export async function GET() {
  try {
    await connectToDatabase();

    // 1. Seed Admin User
    let adminUser = await User.findOne({ email: "admin@quarry.com" });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      adminUser = await User.create({
        name: "Admin Manager",
        email: "admin@quarry.com",
        password: hashedPassword,
        role: "admin",
      });
    }

    // 2. Ensure Company Settings Exist
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

    // 3. Seed Customer Account: ROBERT MOBILE GARDEN
    let customer = await Customer.findOne({ name: "ROBERT MOBILE GARDEN" });
    if (!customer) {
      customer = await Customer.create({
        name: "ROBERT MOBILE GARDEN",
        mobile: "9443100000",
        gstin: "",
        address: "PARUTHIVILAI, Tamilnadu",
        deliveryPlace: "PARUTHIVILAI",
        openingBalance: 0,
      });
    }

    // 4. Seed Ledger Sample Bills (from screenshot)
    let bill1 = await Bill.findOne({ invoiceNo: "11439" });
    if (!bill1) {
      await Bill.create({
        invoiceNo: "11439",
        date: "2026-06-03",
        vehicleNo: "TN74BK6973",
        deliveryPlace: "PARUTHIVILAI",
        loadingCharges: 4800,
        lorryFreight: 0,
        companyName: "QUARRY SERVICES",
        documentTitle: "BILL OF SUPPLY",
        copyLabel: "Original Copy",
        billedTo: {
          name: "ROBERT MOBILE GARDEN",
          mobile: "9443100000",
          gstin: "",
          address: "PARUTHIVILAI",
        },
        shippedTo: {
          name: "ROBERT MOBILE GARDEN",
          mobile: "9443100000",
          gstin: "",
          address: "PARUTHIVILAI",
        },
        items: [
          {
            sn: 1,
            description: "20MM",
            hsnSac: "",
            qty: 32.19,
            unit: "Tonne",
            price: 660,
            amount: 21245,
          },
        ],
        totalQty: 32.19,
        totalQtyUnit: "Tonne",
        taxRate: "Exempt",
        taxableAmount: 21245,
        grandTotal: 26045,
        amountInWords: "Rupees Twenty Six Thousand Forty Five Only",
        bankDetails: { accountName: "", accountNumber: "", ifscCode: "", bankBranch: "" },
        termsAndConditions: [],
        authorisedSignatoryText: "",
      });
    }

    let bill2 = await Bill.findOne({ invoiceNo: "11534" });
    if (!bill2) {
      await Bill.create({
        invoiceNo: "11534",
        date: "2026-06-03",
        vehicleNo: "TN74BK7556",
        deliveryPlace: "PARUTHIVILAI",
        loadingCharges: 4800,
        lorryFreight: 0,
        companyName: "QUARRY SERVICES",
        documentTitle: "BILL OF SUPPLY",
        copyLabel: "Original Copy",
        billedTo: {
          name: "ROBERT MOBILE GARDEN",
          mobile: "9443100000",
          gstin: "",
          address: "PARUTHIVILAI",
        },
        shippedTo: {
          name: "ROBERT MOBILE GARDEN",
          mobile: "9443100000",
          gstin: "",
          address: "PARUTHIVILAI",
        },
        items: [
          {
            sn: 1,
            description: "CONCRETE SAND",
            hsnSac: "",
            qty: 32.72,
            unit: "Tonne",
            price: 810,
            amount: 26503,
          },
        ],
        totalQty: 32.72,
        totalQtyUnit: "Tonne",
        taxRate: "Exempt",
        taxableAmount: 26503,
        grandTotal: 31303,
        amountInWords: "Rupees Thirty One Thousand Three Hundred Three Only",
        bankDetails: { accountName: "", accountNumber: "", ifscCode: "", bankBranch: "" },
        termsAndConditions: [],
        authorisedSignatoryText: "",
      });
    }

    return NextResponse.json({
      message: "Database seeded cleanly with customer accounts & ledger sample data",
      admin: { email: adminUser.email, password: "admin123" },
      customerId: customer._id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
