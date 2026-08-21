import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { formatCurrency } from "@/lib/utils";
import { FileText, PlusCircle, TrendingUp, Truck, DollarSign, Settings, Eye, Printer, Edit } from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();
  const bills = await Bill.find().sort({ createdAt: -1 }).limit(10).lean();
  const totalBillsCount = await Bill.countDocuments();

  // Compute aggregated stats
  const allBills = await Bill.find().select("grandTotal totalQty").lean();
  const totalRevenue = allBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  const totalQtySum = allBills.reduce((acc, b) => acc + (b.totalQty || 0), 0);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Welcome Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 p-6 rounded-3xl border border-slate-800 shadow-2xl">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome back, <span className="text-amber-400">{session.name}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quarry Billing Overview & Management Dashboard
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/bills/new"
            className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Bill</span>
          </Link>
          <Link
            href="/settings"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Company Settings"
          >
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Bills */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bills</span>
            <div className="text-3xl font-extrabold text-white mt-1">{totalBillsCount}</div>
            <span className="text-xs text-amber-400 mt-1 block">Generated Bills</span>
          </div>
          <div className="bg-slate-800 text-amber-400 p-3.5 rounded-2xl border border-slate-700">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">₹{formatCurrency(totalRevenue)}</div>
            <span className="text-xs text-slate-400 mt-1 block">Gross Supply Value</span>
          </div>
          <div className="bg-emerald-950/60 text-emerald-400 p-3.5 rounded-2xl border border-emerald-900/50">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Total Material Sold */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Material Qty</span>
            <div className="text-3xl font-extrabold text-amber-300 mt-1">
              {totalQtySum ? Number(totalQtySum).toFixed(2) : "0.00"} <span className="text-base font-normal text-slate-400">Tonne</span>
            </div>
            <span className="text-xs text-slate-400 mt-1 block">Dispatched Weight</span>
          </div>
          <div className="bg-amber-950/60 text-amber-300 p-3.5 rounded-2xl border border-amber-900/50">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Recent Bills Table Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Quarry Bills</h2>
            <p className="text-xs text-slate-400">Latest generated bills & invoices</p>
          </div>
          <Link
            href="/bills"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            View All Bills &rarr;
          </Link>
        </div>

        {bills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p>No bills generated yet.</p>
            <Link
              href="/bills/new"
              className="inline-flex items-center gap-2 text-xs text-amber-400 font-bold bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" /> Create your first bill
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Billed To</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map((bill: any) => (
                  <tr key={bill._id.toString()} className="hover:bg-slate-950/50 transition-colors">
                    <td className="p-3 font-bold text-amber-400">{bill.invoiceNo}</td>
                    <td className="p-3 text-slate-300">{bill.date}</td>
                    <td className="p-3 font-semibold text-white uppercase">{bill.billedTo?.name || "--"}</td>
                    <td className="p-3 font-mono text-amber-300">{bill.vehicleNo || "--"}</td>
                    <td className="p-3 text-slate-300">
                      {bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : "--"}
                    </td>
                    <td className="p-3 font-extrabold text-emerald-400">₹{formatCurrency(bill.grandTotal)}</td>
                    <td className="p-3 text-right space-x-1">
                      <Link
                        href={`/bills/${bill._id}`}
                        className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        href={`/bills/${bill._id}/print`}
                        className="inline-flex items-center p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 transition-colors"
                        title="Print bill"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
