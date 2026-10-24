"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrendingUp, TrendingDown, IndianRupee, Truck, Search, X, ChevronRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import DateRangeFilter, { DateRange, inDateRange } from "@/components/DateRangeFilter";
import SaleStatusBadge from "@/components/SaleStatusBadge";

interface TradeRow {
  _id: string;
  inwardNo: string;
  date: string;
  vendorName: string;
  material: string;
  qty: number;
  unit: string;
  soldQty: number;
  remainingQty: number;
  saleStatus: string;
  invoices: string[];
  trade: { income: number; cost: number; profit: number; marginPct: number };
  vendorPayment: { status: string; due: number };
  customerPayment: { status: string; due: number };
}

/** Paid / Partly paid / Unpaid, with the amount still pending. */
function PayStatus({ status, due, hint }: { status: string; due: number; hint: string }) {
  const style =
    status === "PAID"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
      : status === "PARTIAL"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/35"
      : "bg-red-500/15 text-red-400 border-red-500/35";
  const label = status === "PAID" ? "Paid" : status === "PARTIAL" ? "Partly paid" : "Unpaid";
  return (
    <span className="inline-flex flex-col items-start gap-0.5" title={hint}>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${style}`}>{label}</span>
      {status !== "PAID" && <span className="text-[10px] text-slate-500 whitespace-nowrap">₹{formatCurrency(due)} due</span>}
    </span>
  );
}

const VENDOR_HINT = "Our payment to the vendor for this load";
const CUSTOMER_HINT = "Customer payment on the invoices this load was sold on";

type Tab = "ALL" | "MARGIN" | "LOSS" | "PARTLY";
const TABS: { id: Tab; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "MARGIN", label: "Margin" },
  { id: "LOSS", label: "Loss" },
  { id: "PARTLY", label: "Partly sold" },
];

const money = (n: number) => `${n < 0 ? "−" : ""}₹${formatCurrency(Math.abs(n))}`;
const profitColor = (n: number) => (n < 0 ? "text-red-400" : "text-emerald-400");

export default function TradeMarginPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  const [tab, setTab] = useState<Tab>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/reports/trade-margin");
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Totals follow the dates (purchase date of the load) and the search, not the tab
  const inRange = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inDateRange(rows, dateRange, (r) => r.date).filter(
      (r) => !q || [r.inwardNo, r.vendorName, r.material, ...r.invoices].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [rows, dateRange, search]);

  const visible = useMemo(() => {
    if (tab === "MARGIN") return inRange.filter((r) => r.trade.profit >= 0);
    if (tab === "LOSS") return inRange.filter((r) => r.trade.profit < 0);
    if (tab === "PARTLY") return inRange.filter((r) => r.saleStatus === "PARTLY_SOLD");
    return inRange;
  }, [inRange, tab]);

  const totals = useMemo(() => {
    const income = inRange.reduce((s, r) => s + r.trade.income, 0);
    const cost = inRange.reduce((s, r) => s + r.trade.cost, 0);
    const profit = income - cost;
    return {
      income,
      cost,
      profit,
      pct: income > 0 ? Math.round((profit / income) * 1000) / 10 : 0,
      lossLoads: inRange.filter((r) => r.trade.profit < 0).length,
    };
  }, [inRange]);

  const cards = [
    { label: "Income", value: money(totals.income), note: "Sales of these loads", icon: IndianRupee, color: "text-white", tint: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "Cost", value: money(totals.cost), note: "Purchase cost of the qty sold", icon: Truck, color: "text-white", tint: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    {
      label: totals.profit < 0 ? "Trade Loss" : "Trade Margin",
      value: money(totals.profit),
      note: totals.income > 0 ? `${totals.pct}% of income` : "Nothing sold yet",
      icon: totals.profit < 0 ? TrendingDown : TrendingUp,
      color: profitColor(totals.profit),
      tint: totals.profit < 0 ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    { label: "Loss-making loads", value: String(totals.lossLoads), note: `of ${inRange.length} loads sold`, icon: TrendingDown, color: totals.lossLoads ? "text-red-400" : "text-white", tint: "text-red-400 bg-red-500/10 border-red-500/20" },
  ];

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      <div>
        <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
          <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" />
          <span>Trade Margin</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Margin on every purchase load sold: income from the customer vs. what the load cost us (GST excluded)
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">{c.label}</span>
              <div className={`text-lg sm:text-2xl font-black truncate ${c.color}`}>{c.value}</div>
              <div className="text-[10px] text-slate-500">{c.note}</div>
            </div>
            <div className={`hidden sm:flex w-12 h-12 rounded-2xl border items-center justify-center shrink-0 ${c.tint}`}>
              <c.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl border border-slate-800 p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  tab === t.id ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Load, vendor, material, invoice"
                className="w-full sm:w-64 bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-8 py-2 sm:py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 cursor-pointer" aria-label="Clear search">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-500 py-10">Loading…</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-10 space-y-1">
            <p className="text-sm text-slate-400">
              {rows.length === 0 ? "No purchase loads sold yet." : "No loads match these filters."}
            </p>
            {rows.length === 0 && (
              <p className="text-xs text-slate-500">Create a sales bill and pick the load in “Sell from Purchase” to see its margin here.</p>
            )}
          </div>
        ) : (
          <>
            {/* Phones: one card per load */}
            <div className="md:hidden space-y-2">
              {visible.map((r) => (
                <Link key={r._id} href={`/purchases/${r._id}`} className="block rounded-2xl border border-slate-800 bg-slate-950/40 p-3 space-y-2 active:bg-slate-900">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-amber-400">{r.inwardNo}</div>
                      <div className="text-[11px] text-slate-400 truncate uppercase">{r.vendorName} • {r.material}</div>
                    </div>
                    <div className={`text-right font-black ${profitColor(r.trade.profit)}`}>
                      {money(r.trade.profit)}
                      <div className="text-[10px] font-bold">{r.trade.marginPct}%</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <SaleStatusBadge status={r.saleStatus} soldQty={r.soldQty} qty={r.qty} unit={r.unit} />
                    <span>{formatDate(r.date)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div><span className="text-slate-500">Income </span><span className="text-slate-200 font-bold">{money(r.trade.income)}</span></div>
                    <div><span className="text-slate-500">Cost </span><span className="text-slate-200 font-bold">{money(r.trade.cost)}</span></div>
                    <div className="space-y-0.5"><span className="block text-[10px] text-slate-500 uppercase font-bold">Vendor</span><PayStatus {...r.vendorPayment} hint={VENDOR_HINT} /></div>
                    <div className="space-y-0.5"><span className="block text-[10px] text-slate-500 uppercase font-bold">Customer</span><PayStatus {...r.customerPayment} hint={CUSTOMER_HINT} /></div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <th className="py-2.5 pr-3">Load</th>
                    <th className="py-2.5 pr-3">Date</th>
                    <th className="py-2.5 pr-3">Vendor / Material</th>
                    <th className="py-2.5 pr-3">Sold</th>
                    <th className="py-2.5 pr-3">Invoices</th>
                    <th className="py-2.5 pr-3" title={VENDOR_HINT}>Vendor</th>
                    <th className="py-2.5 pr-3" title={CUSTOMER_HINT}>Customer</th>
                    <th className="py-2.5 pr-3 text-right">Income</th>
                    <th className="py-2.5 pr-3 text-right">Cost</th>
                    <th className="py-2.5 pr-3 text-right">Margin</th>
                    <th className="py-2.5 w-6" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {visible.map((r) => (
                    <tr key={r._id} onClick={() => router.push(`/purchases/${r._id}`)} className="hover:bg-slate-900/60 cursor-pointer">
                      <td className="py-2.5 pr-3 font-black text-amber-400">{r.inwardNo}</td>
                      <td className="py-2.5 pr-3 text-slate-300 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="text-slate-200 font-semibold uppercase">{r.vendorName}</div>
                        <div className="text-[11px] text-slate-500 uppercase">{r.material}</div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <SaleStatusBadge status={r.saleStatus} soldQty={r.soldQty} qty={r.qty} unit={r.unit} />
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-400">{r.invoices.join(", ")}</td>
                      <td className="py-2.5 pr-3"><PayStatus {...r.vendorPayment} hint={VENDOR_HINT} /></td>
                      <td className="py-2.5 pr-3"><PayStatus {...r.customerPayment} hint={CUSTOMER_HINT} /></td>
                      <td className="py-2.5 pr-3 text-right text-slate-200">{money(r.trade.income)}</td>
                      <td className="py-2.5 pr-3 text-right text-slate-300">{money(r.trade.cost)}</td>
                      <td className={`py-2.5 pr-3 text-right font-black whitespace-nowrap ${profitColor(r.trade.profit)}`}>
                        {money(r.trade.profit)}
                        <span className="block text-[10px] font-bold">{r.trade.marginPct}%</span>
                      </td>
                      <td className="py-2.5 text-slate-600"><ChevronRight className="w-4 h-4" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-[11px] text-slate-500">
          Income = material sold − its share of the bill discount + its share of loading / lorry charges billed. Cost = material
          + freight (if paid by us) + loading + other charges of the load, for the quantity sold. Dates filter by the load&apos;s purchase date. Vendor = our payment for the load; Customer = payment on the invoices it was sold on.
        </p>
      </div>
    </div>
  );
}
