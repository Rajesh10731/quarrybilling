import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Purchase } from "@/models/Purchase";
import { Bill } from "@/models/Bill";
import { getSession } from "@/lib/auth";
import { round2 } from "@/lib/ledger";
import { purchaseSales, soldStatus, tradeMargin } from "@/lib/sourcing";

const statusOf = (paid: number, total: number) => (total - paid <= 0.005 ? "PAID" : paid > 0.005 ? "PARTIAL" : "UNPAID");

/**
 * Trade margin of every purchase load that has been (partly) sold on sales bills,
 * with how far the vendor has been paid and how far the customers have paid us.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const sold = await purchaseSales();
    const purchases = await Purchase.find({ _id: { $in: [...sold.keys()] } })
      .sort({ date: -1, createdAt: -1 })
      .select("inwardNo date vendorName material qty unit materialAmount lorryFreight freightPaidBy loadingCharges otherCharges grandTotal paidAmount")
      .lean();

    const billIds = [...new Set([...sold.values()].flatMap((s) => s.sales.map((x) => x.billId)))];
    const bills = await Bill.find({ _id: { $in: billIds } }).select("grandTotal paidAmount").lean();
    const billById = new Map(bills.map((b) => [String(b._id), b]));

    return NextResponse.json(
      purchases.map((p) => {
        const summary = sold.get(String(p._id));
        const { sales, ...trade } = tradeMargin(p, summary);

        // Vendor side: what we owe for this load
        const vendorPaid = p.paidAmount || 0;
        const vendorDue = round2(Math.max(0, (p.grandTotal || 0) - vendorPaid));

        // Customer side: the invoices this load was sold on (whole invoice amounts)
        const invoiceIds = [...new Set(sales.map((s) => s.billId))];
        const invTotal = invoiceIds.reduce((t, id) => t + (billById.get(id)?.grandTotal || 0), 0);
        const invPaid = invoiceIds.reduce((t, id) => t + (billById.get(id)?.paidAmount || 0), 0);

        return {
          _id: p._id,
          inwardNo: p.inwardNo,
          date: p.date,
          vendorName: p.vendorName,
          material: p.material,
          qty: p.qty,
          unit: p.unit,
          ...soldStatus(p, summary),
          invoices: [...new Set(sales.map((s) => s.invoiceNo))],
          trade,
          vendorPayment: { status: statusOf(vendorPaid, p.grandTotal || 0), due: vendorDue },
          customerPayment: { status: statusOf(invPaid, invTotal), due: round2(Math.max(0, invTotal - invPaid)) },
        };
      })
    );
  } catch (error: any) {
    return NextResponse.json({ message: error?.message || "Failed to load trade margin" }, { status: 500 });
  }
}
