import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { CompanySettings } from "@/models/CompanySettings";
import { getSession } from "@/lib/auth";
import { containsText, exactName, round2, toISODate } from "@/lib/ledger";

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = toISODate(searchParams.get("fromDate"));
    const toDate = toISODate(searchParams.get("toDate"));
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
      paymentFilter.customerName = exactName(customerName);
    }

    if (query) {
      paymentFilter.$or = [
        { customerName: containsText(query) },
        { invoiceNo: containsText(query) },
        { paymentNumber: containsText(query) },
        { referenceNo: containsText(query) },
        { notes: containsText(query) },
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
        { "billedTo.name": exactName(customerName) },
      ];
    }
    const allBills = await Bill.find(billFilter).sort({ date: -1, createdAt: -1 });

    // 5. Calculate Customer-wise summaries
    // Map customer name -> { name, mobile, openingBalance, totalBilled, totalPaid, totalTransportCharges, totalLoadingCharges, balanceDue, billsCount, lastPaymentDate }
    const customerMap = new Map<string, {
      name: string;
      mobile: string;
      openingBalance: number;
      totalBilled: number;
      totalPaid: number;
      totalTransportCharges: number;
      totalLoadingCharges: number;
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
        mobile: c.mobile || "",
        openingBalance: c.openingBalance || 0,
        totalBilled: 0,
        totalPaid: 0,
        totalTransportCharges: 0,
        totalLoadingCharges: 0,
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
          mobile: b.billedTo?.mobile || "",
          openingBalance: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalTransportCharges: 0,
          totalLoadingCharges: 0,
          balanceDue: 0,
          billsCount: 0,
          lastPaymentDate: "--",
          unpaidBillsCount: 0,
        });
      }
      const entry = customerMap.get(bCust)!;
      if (!entry.mobile && b.billedTo?.mobile) entry.mobile = b.billedTo.mobile;
      entry.totalBilled += b.grandTotal || 0;
      entry.totalTransportCharges += b.lorryFreight || 0;
      entry.totalLoadingCharges += b.loadingCharges || 0;
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
      totalTransportCharges: round2(c.totalTransportCharges),
      totalLoadingCharges: round2(c.totalLoadingCharges),
      // Owed = opening balance + everything billed - everything received
      balanceDue: Math.max(0, round2(c.openingBalance + c.totalBilled - c.totalPaid)),
    })).filter((c) => {
      if (customerName) {
        return c.name.toLowerCase() === customerName.toLowerCase();
      }
      return c.totalBilled > 0 || c.totalPaid > 0 || c.openingBalance !== 0;
    }).sort((a, b) => b.balanceDue - a.balanceDue);

    // Build detailed bills list for sales & balance audit
    const reportBills = allBills.map((b) => {
      const bCust = (b.billedTo?.name || "").trim().toUpperCase();
      const custSummary = customerMap.get(bCust);
      const paid = b.paidAmount || 0;
      const grand = b.grandTotal || 0;
      const due = Math.max(0, round2(grand - paid));
      return {
        _id: b._id,
        invoiceNo: b.invoiceNo,
        date: b.date,
        customerName: b.billedTo?.name || "--",
        customerMobile: b.billedTo?.mobile || custSummary?.mobile || "",
        deliveryPlace: b.deliveryPlace || b.station || "",
        vehicleNo: b.vehicleNo || "--",
        transport: b.transport || "--",
        transportCharges: b.lorryFreight || 0,
        loadingCharges: b.loadingCharges || 0,
        totalQty: b.totalQty || 0,
        totalQtyUnit: b.totalQtyUnit || "Tonne",
        grandTotal: grand,
        paidAmount: paid,
        balanceDue: due,
        customerBalanceTillDate: custSummary?.balanceDue ?? due,
        paymentStatus: b.paymentStatus || "UNPAID",
      };
    });

    // 6. Overall KPIs for filtered view
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalBilled = allBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
    const totalTransportCharges = allBills.reduce((sum, b) => sum + (b.lorryFreight || 0), 0);
    const totalLoadingCharges = allBills.reduce((sum, b) => sum + (b.loadingCharges || 0), 0);
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
      bills: reportBills,
      kpi: {
        totalCollected,
        totalBilled,
        totalOutstanding,
        totalTransportCharges,
        totalLoadingCharges,
        transactionCount: payments.length,
        billsCount: allBills.length,
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
