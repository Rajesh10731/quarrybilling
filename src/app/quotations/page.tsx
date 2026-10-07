"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Eye, Printer, PlusCircle, Search, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import QuotationStatusBadge from "@/components/QuotationStatusBadge";
import type { QuotationData } from "@/components/QuotationPrintView";

const TABS = ["ALL", "OPEN", "ACCEPTED", "CONVERTED", "REJECTED", "EXPIRED"] as const;
const TAB_LABELS: Record<string, string> = { ALL: "All", OPEN: "Open", ACCEPTED: "Accepted", CONVERTED: "Billed", REJECTED: "Rejected", EXPIRED: "Expired" };

export default function QuotationsPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("ALL");

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/quotations?query=${encodeURIComponent(search)}`);
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (Array.isArray(data)) setQuotations(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, router]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: quotations.length };
    for (const q of quotations) c[q.displayStatus || "OPEN"] = (c[q.displayStatus || "OPEN"] || 0) + 1;
    return c;
  }, [quotations]);

  const shown = tab === "ALL" ? quotations : quotations.filter((q) => (q.displayStatus || "OPEN") === tab);
  const openValue = quotations
    .filter((q) => q.displayStatus === "OPEN" || q.displayStatus === "ACCEPTED")
    .reduce((s, q) => s + (q.grandTotal || 0), 0);
  const billedValue = quotations.filter((q) => q.status === "CONVERTED").reduce((s, q) => s + (q.grandTotal || 0), 0);

  const handleDelete = async (q: QuotationData) => {
    if (!confirm(`Delete quotation ${q.quotationNo} for ${q.customer?.name}?`)) return;
    const res = await fetch(`/api/quotations/${q._id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setQuotations((prev) => prev.filter((x) => x._id !== q._id));
    else alert(data.message || "Failed to delete quotation");
  };

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-amber-400" /> Sales Quotations
          </h1>
          <p className="text-sm text-slate-400">Quote rates to customers and convert accepted quotations into sales bills.</p>
        </div>
        <Link
          href="/quotations/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-sm"
        >
          <PlusCircle className="w-4 h-4" /> New Quotation
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase">Quotations</div>
          <div className="text-2xl font-black text-white">{quotations.length}</div>
          <div className="text-[11px] text-slate-500">{counts.OPEN || 0} open · {counts.EXPIRED || 0} expired</div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase">Open &amp; Accepted Value</div>
          <div className="text-2xl font-black text-blue-400">₹{formatCurrency(openValue)}</div>
          <div className="text-[11px] text-slate-500">Not yet billed</div>
        </div>
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <div className="text-xs font-bold text-slate-400 uppercase">Converted to Bills</div>
          <div className="text-2xl font-black text-emerald-400">₹{formatCurrency(billedValue)}</div>
          <div className="text-[11px] text-slate-500">{counts.CONVERTED || 0} quotation(s) billed</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-3 border border-slate-800 flex flex-col md:flex-row gap-3 justify-between">
        <div className="relative md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation no, customer, material..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto touch-scroll">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${tab === t ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:bg-slate-800"}`}
            >
              {TAB_LABELS[t]} ({counts[t] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading quotations...</div>
        ) : shown.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <p>No quotations {tab !== "ALL" ? `in "${TAB_LABELS[tab]}"` : "yet"}.</p>
            <Link href="/quotations/new" className="text-amber-400 font-bold underline">Create a quotation</Link>
          </div>
        ) : (
          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left text-sm min-w-[860px]">
              <thead>
                <tr className="text-[11px] uppercase text-slate-400 border-b border-slate-800 bg-slate-950/50">
                  <th className="p-3.5">Quotation #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Valid Until</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Materials</th>
                  <th className="p-3.5 text-right">Total</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {shown.map((q) => (
                  <tr key={q._id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-extrabold text-amber-400">
                      <Link href={`/quotations/${q._id}`} className="hover:underline">{q.quotationNo}</Link>
                    </td>
                    <td className="p-3.5 text-slate-300">{formatDate(q.date)}</td>
                    <td className="p-3.5 text-slate-300">{formatDate(q.validUntil)}</td>
                    <td className="p-3.5 font-bold text-white uppercase">{q.customer?.name}</td>
                    <td className="p-3.5 text-slate-400 text-xs">{(q.items || []).map((it) => it.description).join(", ")}</td>
                    <td className="p-3.5 text-right font-black text-emerald-400">₹{formatCurrency(q.grandTotal || 0)}</td>
                    <td className="p-3.5">
                      <QuotationStatusBadge status={q.displayStatus} />
                      {q.convertedInvoiceNo && <div className="text-[10px] text-slate-500 mt-1">Invoice {q.convertedInvoiceNo}</div>}
                    </td>
                    <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                      <Link href={`/quotations/${q._id}`} title="View" className="inline-flex p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700">
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link href={`/quotations/${q._id}/print`} title="Print" className="inline-flex p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700">
                        <Printer className="w-4 h-4" />
                      </Link>
                      {q.status !== "CONVERTED" && (
                        <button onClick={() => handleDelete(q)} title="Delete" className="inline-flex p-2 bg-slate-800 hover:bg-red-950 text-red-400 rounded-xl border border-slate-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
