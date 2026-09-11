import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { CompanySettings } from "@/models/CompanySettings";
import { getSession } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate") || "";
    const toDate = searchParams.get("toDate") || "";
    const customerName = searchParams.get("customerName") || "";
    const query = searchParams.get("query") || "";

    await connectToDatabase();

    // 1. Build Payment Filter
    const paymentFilter: any = {};
    if (fromDate && toDate) {
      paymentFilter.date = { $gte: fromDate, $lte: toDate };
    } else if (fromDate) {
      paymentFilter.date = { $gte: fromDate };
    } else if (toDate) {
      paymentFilter.date = { $lte: toDate };
    }

    if (customerName) {
      paymentFilter.customerName = { $regex: `^${customerName.trim()}$`, $options: "i" };
    }

    if (query) {
      paymentFilter.$or = [
        { customerName: { $regex: query, $options: "i" } },
        { invoiceNo: { $regex: query, $options: "i" } },
        { paymentNumber: { $regex: query, $options: "i" } },
        { referenceNo: { $regex: query, $options: "i" } },
        { notes: { $regex: query, $options: "i" } },
      ];
    }

    // 2. Fetch Payments
    const payments = await Payment.find(paymentFilter).sort({ date: -1, createdAt: -1 });

    // 3. Fetch all Customers
    const customers = await Customer.find().sort({ name: 1 });

    // 4. Fetch Bills (filtered by customer if selected)
    const billFilter: any = {};
    if (customerName) {
      billFilter.$or = [
        { "billedTo.name": { $regex: `^${customerName.trim()}$`, $options: "i" } },
        { "shippedTo.name": { $regex: `^${customerName.trim()}$`, $options: "i" } },
      ];
    }
    const allBills = await Bill.find(billFilter).sort({ date: -1, createdAt: -1 });

    // 5. Calculate Customer-wise summaries
    // Map customer name -> { totalBilled, totalPaid, balanceDue, billsCount, lastPaymentDate }
    const customerMap = new Map<string, {
      name: string;
      totalBilled: number;
      totalPaid: number;
      balanceDue: number;
      billsCount: number;
      lastPaymentDate: string;
      unpaidBillsCount: number;
    }>();

    // Initialize from Customers collection
    customers.forEach((c) => {
      const cName = c.name.trim().toUpperCase();
      customerMap.set(cName, {
        name: c.name.trim(),
        totalBilled: 0,
        totalPaid: 0,
        balanceDue: 0,
        billsCount: 0,
        lastPaymentDate: "--",
        unpaidBillsCount: 0,
      });
    });

    // Populate bills
    allBills.forEach((b) => {
      const bCust = (b.billedTo?.name || "").trim().toUpperCase();
      if (!customerMap.has(bCust)) {
        customerMap.set(bCust, {
          name: b.billedTo?.name?.trim() || bCust,
          totalBilled: 0,
          totalPaid: 0,
          balanceDue: 0,
          billsCount: 0,
          lastPaymentDate: "--",
          unpaidBillsCount: 0,
        });
      }
      const entry = customerMap.get(bCust)!;
      entry.totalBilled += b.grandTotal || 0;
      entry.billsCount += 1;
      if (b.paymentStatus !== "PAID") {
        entry.unpaidBillsCount += 1;
      }
    });

    // Fetch all lifetime payments to compute true customer balance
    const allLifetimePayments = await Payment.find();
    allLifetimePayments.forEach((p) => {
      const pCust = (p.customerName || "").trim().toUpperCase();
      if (customerMap.has(pCust)) {
        const entry = customerMap.get(pCust)!;
        entry.totalPaid += p.amount || 0;
        if (p.date && (entry.lastPaymentDate === "--" || p.date > entry.lastPaymentDate)) {
          entry.lastPaymentDate = p.date;
        }
      }
    });

    // Compute balanceDue for all customers
    const customerSummaries = Array.from(customerMap.values()).map((c) => ({
      ...c,
      balanceDue: Math.max(0, c.totalBilled - c.totalPaid),
    })).filter((c) => {
      if (customerName) {
        return c.name.toLowerCase() === customerName.toLowerCase();
      }
      return c.totalBilled > 0 || c.totalPaid > 0;
    }).sort((a, b) => b.balanceDue - a.balanceDue);

    // 6. Overall KPIs for filtered view
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalBilled = allBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const totalOutstanding = customerSummaries.reduce((sum, c) => sum + c.balanceDue, 0);

    // 7. Fetch Company Settings for print letterhead
    const company = await CompanySettings.findOne() || {
      companyName: "QUARRY BILLING",
      companyGstin: "",
      companyAddress: "",
      companyMobile: "",
    };

    return NextResponse.json({
      payments,
      customerSummaries,
      kpi: {
        totalCollected,
        totalBilled,
        totalOutstanding,
        transactionCount: payments.length,
      },
      customers: customers.map((c) => ({ _id: c._id, name: c.name })),
      company,
      period: {
        fromDate: fromDate || "All Time",
        toDate: toDate || "All Time",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Failed to generate payment report" },
      { status: 500 }
    );
  }
}
