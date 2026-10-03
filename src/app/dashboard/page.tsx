import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { Bill } from "@/models/Bill";
import { Customer } from "@/models/Customer";
import { Purchase } from "@/models/Purchase";
import { Vendor } from "@/models/Vendor";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  FileText,
  PlusCircle,
  TrendingUp,
  Truck,
  DollarSign,
  Settings,
  Eye,
  Printer,
  Users,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  Scale,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  await connectToDatabase();
  const bills = await Bill.find().sort({ createdAt: -1 }).limit(6).lean();
  const recentPurchases = await Purchase.find().sort({ createdAt: -1 }).limit(5).lean();
  const totalBillsCount = await Bill.countDocuments();
  const totalCustomersCount = await Customer.countDocuments();

  // Compute aggregated sales stats
  const allBills = await Bill.find().select("grandTotal totalQty paymentStatus").lean();
  const totalRevenue = allBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
  const totalQtySum = allBills.reduce((acc, b) => acc + (b.totalQty || 0), 0);
  const unpaidCount = allBills.filter((b) => b.paymentStatus === "UNPAID" || !b.paymentStatus).length;

  // Compute inward purchase stats
  const totalPurchasesCount = await Purchase.countDocuments();
  const allPurchases = await Purchase.find().select("grandTotal paidAmount qty").lean();
  const totalPurchaseSpend = allPurchases.reduce((acc, p) => acc + (p.grandTotal || 0), 0);
  const totalInwardTons = allPurchases.reduce((acc, p) => acc + (p.qty || 0), 0);
  // Still owed to vendors: opening balances + unpaid part of each purchase (same rule as the vendor screens)
  const vendorOpening = await Vendor.find().select("openingBalance").lean();
  const pendingPurchasePayables =
    vendorOpening.reduce((acc, v) => acc + (v.openingBalance || 0), 0) +
    allPurchases.reduce((acc, p) => acc + Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0)), 0);

  const currentDateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-6">
      {/* Top Welcome Hero Banner */}
      <div className="relative overflow-hidden glass-card rounded-3xl p-5 sm:p-8 border border-slate-800/80 shadow-2xl">
        {/* Glow ambient background lights */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-amber-500/15 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute -bottom-16 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[90px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black tracking-wide">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>LIVE QUARRY ERP</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Welcome, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">{session.name}</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              {currentDateStr} • Quarry sales billing, inward transport loads, and customer ledgers.
            </p>
          </div>

          {/* Action Buttons (Thumb-friendly & high-contrast) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <Link
              href="/bills/new"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 transition-all text-xs sm:text-sm tap-active"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>+ Sales Bill</span>
            </Link>

            <Link
              href="/purchases/new"
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-slate-900/90 hover:bg-slate-800 text-amber-400 font-black rounded-2xl border border-amber-500/40 shadow-lg shadow-amber-500/10 transition-all text-xs sm:text-sm tap-active"
            >
              <Truck className="w-4 h-4 shrink-0" />
              <span>+ Inward Load</span>
            </Link>

            <Link
              href="/customers"
              className="flex items-center justify-center space-x-1.5 px-3.5 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-bold rounded-2xl border border-slate-700/80 transition-all text-xs"
            >
              <Users className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Customers</span>
            </Link>

            <Link
              href="/reports/payments"
              className="flex items-center justify-center space-x-1.5 px-3.5 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-2xl border border-amber-500/30 transition-all text-xs"
            >
              <DollarSign className="w-4 h-4 shrink-0" />
              <span>Payments</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {/* Total Bills */}
        <div className="glass-card glass-card-hover rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Sales Invoices
            </span>
            <div className="text-xl sm:text-3xl font-black text-white">{totalBillsCount}</div>
            <div className="text-[10px] sm:text-[11px] text-amber-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{unpaidCount} unpaid bills</span>
            </div>
          </div>
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Revenue */}
        <div className="glass-card glass-card-hover rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Revenue
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400 truncate max-w-[120px] sm:max-w-none">
              ₹{formatCurrency(totalRevenue)}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Billed sales value</div>
          </div>
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Material Sold */}
        <div className="glass-card glass-card-hover rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Dispatched Weight
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-300">
              {totalQtySum ? Number(totalQtySum).toFixed(2) : "0.00"}{" "}
              <span className="text-xs font-semibold text-slate-400">Tonne</span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Aggregates & sand</div>
          </div>
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Customer Accounts */}
        <div className="glass-card glass-card-hover rounded-2xl p-4 sm:p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Customer Accounts
            </span>
            <div className="text-xl sm:text-3xl font-black text-blue-400">{totalCustomersCount}</div>
            <div className="text-[10px] text-slate-400 font-medium">Registered clients</div>
          </div>
          <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 shadow-inner">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Inward Purchases & Raw Material Summary Strip */}
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-950 via-slate-900/90 to-slate-950">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black text-white uppercase tracking-wide">
                Inward Purchases & Lorry Transport
              </span>
              <span className="text-[9px] sm:text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                Transport
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400">
              {totalPurchasesCount} lorry loads received • {totalInwardTons.toFixed(2)} Tonne purchased
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-800/80 pt-3 md:pt-0">
          <div>
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">Total Purchases:</span>
            <span className="font-black text-white text-sm sm:text-base">₹{formatCurrency(totalPurchaseSpend)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] sm:text-[11px]">Vendor Payables:</span>
            <span className="font-black text-red-400 text-sm sm:text-base">₹{formatCurrency(pendingPurchasePayables)}</span>
          </div>
          <Link
            href="/purchases"
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold rounded-xl border border-amber-500/30 transition-all text-xs tap-active"
          >
            <span>View All Inwards</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Grid: Recent Outward Sales Bills & Recent Inward Loads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Recent Sales Invoices */}
        <div className="glass-card rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>Recent Sales Invoices</span>
              </h2>
              <p className="text-[11px] text-slate-400">Outward lorry billing dispatches</p>
            </div>

            <Link
              href="/bills"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {bills.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <FileText className="w-9 h-9 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs font-semibold text-slate-400">No quarry bills generated yet.</p>
              <Link
                href="/bills/new"
                className="inline-flex items-center gap-1.5 text-xs text-slate-950 font-bold bg-amber-500 px-3.5 py-1.5 rounded-xl mt-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Create Bill
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill: any) => {
                const status = bill.paymentStatus || "UNPAID";
                const isPaid = status === "PAID";
                const isPartial = status === "PARTIAL";
                return (
                  <div
                    key={bill._id.toString()}
                    className="p-3.5 bg-slate-950/70 hover:bg-slate-900/60 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-amber-400">#{bill.invoiceNo}</span>
                        <span className="vehicle-plate text-[10px] py-0.5 px-2">
                          {bill.vehicleNo || "--"}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                            : isPartial
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/35"
                            : "bg-red-500/15 text-red-400 border-red-500/35"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-400" : isPartial ? "bg-amber-400" : "bg-red-400"}`} />
                        {isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer:</span>
                        <span className="font-extrabold text-white uppercase truncate block">
                          {bill.billedTo?.name || "--"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Bill Total:</span>
                        <span className="font-black text-emerald-400 text-sm">₹{formatCurrency(bill.grandTotal)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-500" />
                        {bill.date}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/bills/${bill._id.toString()}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[10px] transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/bills/${bill._id.toString()}/print`}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[10px] transition-colors flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Recent Inward Purchases */}
        <div className="glass-card rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <span>Recent Inward Loads</span>
              </h2>
              <p className="text-[11px] text-slate-400">Raw stone & material arrivals</p>
            </div>

            <Link
              href="/purchases"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-xl transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentPurchases.length === 0 ? (
            <div className="text-center py-10 text-slate-500 space-y-2">
              <Truck className="w-9 h-9 mx-auto text-slate-600 opacity-50" />
              <p className="text-xs font-semibold text-slate-400">No inward loads recorded yet.</p>
              <Link
                href="/purchases/new"
                className="inline-flex items-center gap-1.5 text-xs text-slate-950 font-bold bg-amber-500 px-3.5 py-1.5 rounded-xl mt-1"
              >
                <Truck className="w-3.5 h-3.5" /> Record Inward
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPurchases.map((purchase: any) => {
                const status = purchase.paymentStatus || "UNPAID";
                const isPaid = status === "PAID";
                const isPartial = status === "PARTIAL";
                return (
                  <div
                    key={purchase._id.toString()}
                    className="p-3.5 bg-slate-950/70 hover:bg-slate-900/60 rounded-2xl border border-slate-800/90 space-y-2.5 transition-all shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">#{purchase.inwardNo}</span>
                        <span className="vehicle-plate text-[10px] py-0.5 px-2">
                          {purchase.vehicleNo || "--"}
                        </span>
                      </div>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                          isPaid
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                            : isPartial
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/35"
                            : "bg-red-500/15 text-red-400 border-red-500/35"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-400" : isPartial ? "bg-amber-400" : "bg-red-400"}`} />
                        {isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="min-w-0 flex-1 mr-2">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Vendor / Supplier:</span>
                        <span className="font-extrabold text-white uppercase truncate block">
                          {purchase.vendorName || "--"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Cost:</span>
                        <span className="font-black text-amber-400 text-sm">₹{formatCurrency(purchase.grandTotal)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                      <span>{purchase.qty?.toFixed(2)} {purchase.unit} • {purchase.material}</span>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/purchases/${purchase._id.toString()}`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[10px] transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/purchases/${purchase._id.toString()}/print`}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-lg text-[10px] border border-slate-700 transition-colors flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
