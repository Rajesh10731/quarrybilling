"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  IndianRupee,
  Calendar,
  Search,
  Printer,
  RefreshCw,
  X,
  Scale,
  Package,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchaseReportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-04-01`;
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [selectedVendor, setSelectedVendor] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("ALL");

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      if (selectedVendor) params.append("vendorName", selectedVendor);
      if (searchQuery) params.append("query", searchQuery);
      if (paymentStatus && paymentStatus !== "ALL") params.append("paymentStatus", paymentStatus);

      const res = await fetch(`/api/reports/purchases?${params.toString()}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch purchase report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, selectedVendor, paymentStatus]);

  const setDatePreset = (preset: "today" | "this_month" | "fy" | "all") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === "fy") {
      const now = new Date();
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setFromDate(`${startYear}-04-01`);
      setToDate(`${startYear + 1}-03-31`);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  const rows = reportData?.rows || [];
  const kpi = reportData?.kpi || {
    totalLoads: 0,
    totalQty: 0,
    totalMaterialAmount: 0,
    totalLorryFreight: 0,
    totalLoadingCharges: 0,
    totalOtherCharges: 0,
    totalTaxAmount: 0,
    totalGrandTotal: 0,
    totalPaid: 0,
    totalPending: 0,
  };
  const vendors = reportData?.vendors || [];
  const company = reportData?.company || {};

  // Client-side search filter
  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r: any) =>
        r.inwardNo?.toLowerCase().includes(q) ||
        r.vendorName?.toLowerCase().includes(q) ||
        r.vehicleNo?.toLowerCase().includes(q) ||
        r.material?.toLowerCase().includes(q) ||
        r.transportName?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:bg-white print:text-black">

      {/* Top Header (hidden in print) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold mb-2">
            <Truck className="w-3.5 h-3.5" />
            <span>Purchase Inward Report — Lorry Freight Separated</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Purchase Report</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Material cost and lorry freight charges shown separately for every inward load
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => window.print()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold rounded-xl shadow-md transition-all text-xs active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Print Letterhead (only when printing) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-wide uppercase text-black">
              {company.companyName || "QUARRY ENTERPRISES"}
            </h1>
            <p className="text-xs text-gray-700">{company.companyAddress || ""}</p>
            <p className="text-xs text-gray-700">
              {company.companyMobile && <span>Phone: {company.companyMobile} | </span>}
              {company.companyGstin && <span>GSTIN: {company.companyGstin}</span>}
            </p>
          </div>
          <div className="text-right border-l-2 border-black pl-4">
            <h2 className="text-base font-extrabold uppercase text-black">Purchase Inward Report</h2>
            <p className="text-xs font-mono">Date: {new Date().toLocaleDateString("en-IN")}</p>
            <p className="text-xs font-semibold">
              Period: {fromDate || "Beginning"} to {toDate || "Present"}
            </p>
            {selectedVendor && (
              <p className="text-xs font-bold text-black uppercase">Vendor: {selectedVendor}</p>
            )}
          </div>
        </div>

        {/* Print summary strip */}
        <div className="grid grid-cols-5 gap-2 border border-black p-2 mt-3 text-xs bg-gray-50">
          <div>
            <span className="font-bold block text-[10px] uppercase">Total Loads:</span>
            <span className="font-extrabold">{kpi.totalLoads}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Material Amount:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalMaterialAmount)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Lorry Freight:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalLorryFreight)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Grand Total:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalGrandTotal)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Balance Pending:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalPending)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards (hidden in print) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 print:hidden">
        {/* Total Loads */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Loads
            </span>
            <div className="text-lg sm:text-2xl font-black text-white">{kpi.totalLoads}</div>
            <div className="text-[9px] sm:text-[10px] text-slate-400">
              {kpi.totalQty?.toFixed(2)} Tons received
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Material Amount */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Material Cost
            </span>
            <div className="text-lg sm:text-2xl font-black text-white truncate max-w-[110px] sm:max-w-none">
              ₹{formatCurrency(kpi.totalMaterialAmount)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400">Stone / material value</div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Lorry Freight — highlighted separately */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Lorry Freight
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-300 truncate max-w-[110px] sm:max-w-none">
              ₹{formatCurrency(kpi.totalLorryFreight)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-amber-400/80">Freight separated</div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Grand Total */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Grand Total
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400 truncate max-w-[110px] sm:max-w-none">
              ₹{formatCurrency(kpi.totalGrandTotal)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400">Incl. all charges</div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Balance Pending */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Pending Balance
            </span>
            <div className={`text-lg sm:text-2xl font-black truncate max-w-[110px] sm:max-w-none ${kpi.totalPending > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ₹{formatCurrency(kpi.totalPending)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-red-400">Payable to vendors</div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar (hidden in print) */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between print:hidden">
        {/* Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-800 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none text-xs py-1.5"
              />
            </div>
            <span className="text-slate-500 font-bold">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none text-xs py-1.5 flex-1 sm:flex-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto py-0.5">
            {(["today", "this_month", "fy", "all"] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => setDatePreset(preset)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all shrink-0"
              >
                {preset === "today" ? "Today" : preset === "this_month" ? "This Month" : preset === "fy" ? "FY" : "All Time"}
              </button>
            ))}
          </div>
        </div>

        {/* Vendor, Status, Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Vendor Dropdown */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none uppercase font-semibold"
          >
            <option value="">All Vendors</option>
            {vendors.map((v: string) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>

          {/* Payment Status */}
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-semibold"
          >
            <option value="ALL">All Status</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>

          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search inward no, vehicle, vendor..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-white focus:border-amber-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={fetchReport}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-3xl border border-slate-800 shadow-xl overflow-hidden print:border-none print:shadow-none">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 print:hidden">
          <div>
            <h2 className="text-base font-extrabold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              <span>Purchase Inward Detail — Material &amp; Lorry Freight Separated</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing <span className="text-amber-400 font-bold">{filteredRows.length}</span> purchase records
            </p>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse print:text-black">
            <thead>
              <tr className="border-b border-slate-800 print:border-black text-slate-400 print:text-black font-bold uppercase tracking-wider text-[11px] bg-slate-950/40 print:bg-gray-100">
                <th className="p-3 print:p-1.5">Inward No / Date</th>
                <th className="p-3 print:p-1.5">Vendor</th>
                <th className="p-3 print:p-1.5">Lorry / Vehicle</th>
                <th className="p-3 print:p-1.5">Material &amp; Qty</th>
                <th className="p-3 print:p-1.5 text-right">Rate (₹)</th>
                <th className="p-3 print:p-1.5 text-right">Material Amt</th>
                <th className="p-3 print:p-1.5 text-right text-amber-400 print:text-black">Lorry Freight</th>
                <th className="p-3 print:p-1.5 text-right">Grand Total</th>
                <th className="p-3 print:p-1.5 text-right text-emerald-400 print:text-black">Paid</th>
                <th className="p-3 print:p-1.5 text-right text-red-400 print:text-black">Pending</th>
                <th className="p-3 print:p-1.5 text-center">Status</th>
                <th className="p-3 print:p-1.5 text-right print:hidden">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 print:divide-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-400 font-medium">
                    Loading purchase records...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-slate-500">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                    <p className="font-semibold text-slate-400">No purchases found for this filter.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((r: any) => {
                  const isPaid = r.paymentStatus === "PAID";
                  const isPartial = r.paymentStatus === "PARTIAL";
                  return (
                    <tr key={r._id} className="hover:bg-slate-800/40 print:hover:bg-transparent transition-colors">
                      {/* Inward No / Date */}
                      <td className="p-3 print:p-1.5">
                        <Link
                          href={`/purchases/${r._id}`}
                          className="font-mono font-bold text-amber-400 print:text-black hover:underline flex items-center gap-1"
                        >
                          {r.inwardNo}
                          <ExternalLink className="w-2.5 h-2.5 print:hidden" />
                        </Link>
                        <span className="text-[10px] text-slate-400 print:text-gray-600 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {formatDate(r.date)}
                        </span>
                      </td>

                      {/* Vendor */}
                      <td className="p-3 print:p-1.5">
                        <div className="font-bold text-slate-200 print:text-black uppercase">{r.vendorName}</div>
                      </td>

                      {/* Lorry / Vehicle */}
                      <td className="p-3 print:p-1.5">
                        <div className="font-mono text-[11px] font-bold text-slate-200 print:text-black">{r.vehicleNo}</div>
                        <div className="text-[10px] text-slate-400 print:text-gray-600">{r.transportName || "Direct"}</div>
                      </td>

                      {/* Material & Qty */}
                      <td className="p-3 print:p-1.5">
                        <div className="font-bold text-slate-100 print:text-black uppercase">{r.material}</div>
                        <div className="text-[10px] text-amber-400 print:text-black font-bold">
                          {r.qty?.toFixed(2)} {r.unit}
                        </div>
                      </td>

                      {/* Rate */}
                      <td className="p-3 print:p-1.5 text-right font-medium text-slate-300 print:text-black">
                        ₹{formatCurrency(r.rate)}
                        <span className="block text-[10px] text-slate-500 print:text-gray-600">/{r.unit}</span>
                      </td>

                      {/* Material Amount */}
                      <td className="p-3 print:p-1.5 text-right font-bold text-slate-200 print:text-black">
                        ₹{formatCurrency(r.materialAmount)}
                      </td>

                      {/* Lorry Freight — highlighted */}
                      <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black">
                        {r.lorryFreight > 0 ? (
                          <>
                            ₹{formatCurrency(r.lorryFreight)}
                            {r.freightPaidBy && (
                              <span className="block text-[9px] text-amber-400/70 print:text-gray-600 font-normal">
                                {r.freightPaidBy}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-slate-600 print:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Grand Total */}
                      <td className="p-3 print:p-1.5 text-right font-black text-white print:text-black">
                        ₹{formatCurrency(r.grandTotal)}
                      </td>

                      {/* Paid */}
                      <td className="p-3 print:p-1.5 text-right font-bold text-emerald-400 print:text-black">
                        ₹{formatCurrency(r.paidAmount)}
                      </td>

                      {/* Pending */}
                      <td className={`p-3 print:p-1.5 text-right font-black ${r.pendingAmount > 0 ? "text-red-400" : "text-emerald-400"} print:text-black`}>
                        ₹{formatCurrency(r.pendingAmount)}
                      </td>

                      {/* Status */}
                      <td className="p-3 print:p-1.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                            isPaid
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 print:text-black"
                              : isPartial
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 print:text-black"
                              : "bg-red-500/10 text-red-400 border-red-500/30 print:text-black"
                          }`}
                        >
                          {isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID"}
                        </span>
                      </td>

                      {/* View Link */}
                      <td className="p-3 print:p-1.5 text-right print:hidden">
                        <Link
                          href={`/purchases/${r._id}`}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg inline-block transition-colors"
                          title="View Slip"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Footer Totals */}
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-700 print:border-black font-extrabold bg-slate-900/60 print:bg-gray-100">
                  <td colSpan={4} className="p-3 print:p-1.5 uppercase text-slate-300 print:text-black text-right">
                    Totals ({filteredRows.length} loads):
                  </td>
                  <td className="p-3 print:p-1.5 text-right text-slate-400 print:text-black">
                    {/* Rate col — empty */}
                  </td>
                  {/* Material Amount Total */}
                  <td className="p-3 print:p-1.5 text-right font-black text-slate-100 print:text-black">
                    ₹{formatCurrency(filteredRows.reduce((s: number, r: any) => s + (r.materialAmount || 0), 0))}
                  </td>
                  {/* Lorry Freight Total */}
                  <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black">
                    ₹{formatCurrency(filteredRows.reduce((s: number, r: any) => s + (r.lorryFreight || 0), 0))}
                  </td>
                  {/* Grand Total */}
                  <td className="p-3 print:p-1.5 text-right font-black text-white print:text-black text-sm">
                    ₹{formatCurrency(filteredRows.reduce((s: number, r: any) => s + (r.grandTotal || 0), 0))}
                  </td>
                  {/* Paid */}
                  <td className="p-3 print:p-1.5 text-right font-black text-emerald-400 print:text-black">
                    ₹{formatCurrency(filteredRows.reduce((s: number, r: any) => s + (r.paidAmount || 0), 0))}
                  </td>
                  {/* Pending */}
                  <td className="p-3 print:p-1.5 text-right font-black text-red-400 print:text-black">
                    ₹{formatCurrency(filteredRows.reduce((s: number, r: any) => s + (r.pendingAmount || 0), 0))}
                  </td>
                  <td colSpan={2} className="print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="block sm:hidden divide-y divide-slate-800/60 print:hidden">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No records found.</div>
          ) : (
            filteredRows.map((r: any) => {
              const isPaid = r.paymentStatus === "PAID";
              const isPartial = r.paymentStatus === "PARTIAL";
              return (
                <div key={r._id} className="p-4 space-y-3">
                  {/* Top Row */}
                  <div className="flex justify-between items-start">
                    <div>
                      <Link
                        href={`/purchases/${r._id}`}
                        className="font-mono font-bold text-amber-400 text-sm"
                      >
                        {r.inwardNo}
                      </Link>
                      <div className="text-[10px] text-slate-400">{formatDate(r.date)}</div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                        isPaid
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : isPartial
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      }`}
                    >
                      {isPaid ? "PAID" : isPartial ? "PARTIAL" : "UNPAID"}
                    </span>
                  </div>

                  {/* Vendor & Lorry */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Vendor:</span>
                      <div className="font-extrabold text-slate-100 uppercase truncate">{r.vendorName}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Vehicle:</span>
                      <div className="font-mono font-bold text-slate-200">{r.vehicleNo}</div>
                      <div className="text-[10px] text-slate-400">{r.transportName || "Direct"}</div>
                    </div>
                  </div>

                  {/* Material */}
                  <div className="text-xs">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Material:</span>
                    <span className="font-bold text-amber-300 uppercase">{r.qty?.toFixed(2)} {r.unit} — {r.material}</span>
                  </div>

                  {/* Amounts — Freight Separated */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Material Amt:</span>
                      <span className="font-bold text-slate-200">₹{formatCurrency(r.materialAmount)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-amber-400 block uppercase">Lorry Freight:</span>
                      <span className="font-black text-amber-300">
                        {r.lorryFreight > 0 ? `₹${formatCurrency(r.lorryFreight)}` : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Grand Total:</span>
                      <span className="font-black text-white">₹{formatCurrency(r.grandTotal)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-red-400 block uppercase">Pending:</span>
                      <span className={`font-black ${r.pendingAmount > 0 ? "text-red-400" : "text-emerald-400"}`}>
                        ₹{formatCurrency(r.pendingAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block pt-8 font-sans">
        <div className="border-t-2 border-black pt-4 flex justify-between items-end text-xs">
          <div>
            <p className="font-bold">Purchase Summary:</p>
            <p>Total Loads: {kpi.totalLoads} | Total Qty: {kpi.totalQty?.toFixed(2)} Tons</p>
            <p>Material Amount: ₹{formatCurrency(kpi.totalMaterialAmount)}</p>
            <p>Lorry Freight: ₹{formatCurrency(kpi.totalLorryFreight)}</p>
            <p>Grand Total: ₹{formatCurrency(kpi.totalGrandTotal)}</p>
            <p>Total Paid: ₹{formatCurrency(kpi.totalPaid)} | Pending: ₹{formatCurrency(kpi.totalPending)}</p>
            <p className="mt-2 text-[10px] text-gray-500">Generated by QuarryBilling System</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-black mb-1"></div>
            <p className="font-bold uppercase">Authorised Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

