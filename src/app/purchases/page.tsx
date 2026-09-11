"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Truck,
  PlusCircle,
  Search,
  Eye,
  Printer,
  Trash2,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Scale,
  Building2,
  Clock,
  X,
  ArrowUpDown,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchasesListPage() {
  const router = useRouter();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "PARTIAL">("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchPurchases = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases?query=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setPurchases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchases(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPurchases((prev) => prev.filter((p) => p._id !== id));
        setConfirmDeleteId(null);
      } else {
        alert("Failed to delete purchase record");
      }
    } catch (err) {
      alert("Error deleting purchase");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    const target = purchases.find((p) => p._id === id);
    const newPaidAmount = newStatus === "PAID" ? target?.grandTotal || 0 : 0;

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paidAmount: newPaidAmount,
        }),
      });

      if (res.ok) {
        setPurchases((prev) =>
          prev.map((p) =>
            p._id === id
              ? { ...p, paymentStatus: newStatus, paidAmount: newPaidAmount }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle payment", err);
    }
  };

  // Filter purchases based on status tab
  const filteredPurchases = useMemo(() => {
    if (statusFilter === "ALL") return purchases;
    return purchases.filter((p) => (p.paymentStatus || "UNPAID") === statusFilter);
  }, [purchases, statusFilter]);

  // Aggregate stats
  const totalPurchasesCount = purchases.length;
  const totalPurchaseValue = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0),
    [purchases]
  );
  const totalPendingAmount = useMemo(
    () =>
      purchases
        .filter((p) => p.paymentStatus === "UNPAID" || p.paymentStatus === "PARTIAL")
        .reduce((sum, p) => sum + Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0)), 0),
    [purchases]
  );
  const totalInwardTonnage = useMemo(
    () => purchases.reduce((sum, p) => sum + (p.qty || 0), 0),
    [purchases]
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <Truck className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            <span>Inward Purchases & Lorry Transport</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Inward lorry records, weighbridge tonnage, pricing and vendor ledger accounts
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/vendors"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-700/80 text-xs transition-all"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Vendors</span>
          </Link>

          <Link
            href="/purchases/new"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-xs active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ New Inward Load</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Loads */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Inward Loads
            </span>
            <div className="text-xl sm:text-3xl font-black text-white">{totalPurchasesCount}</div>
            <div className="text-[10px] text-slate-500">Total trucks received</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Total Cost */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Purchases Cost
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-400 truncate max-w-[120px] sm:max-w-none">
              ₹{formatCurrency(totalPurchaseValue)}
            </div>
            <div className="text-[10px] text-slate-500">Gross inward value</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Pending Due */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Vendor Pending Due
            </span>
            <div className="text-lg sm:text-2xl font-black text-red-400 truncate max-w-[120px] sm:max-w-none">
              ₹{formatCurrency(totalPendingAmount)}
            </div>
            <div className="text-[10px] text-slate-500">Payable to suppliers</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Inward Tonnage */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Weight / Tonnage
            </span>
            <div className="text-xl sm:text-3xl font-black text-slate-100">
              {totalInwardTonnage.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-500">Tons & Units received</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Vehicle No, Vendor, Material..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto overflow-x-auto touch-scroll">
          {(["ALL", "UNPAID", "PAID", "PARTIAL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab === "ALL"
                ? "All"
                : tab === "PAID"
                ? "Paid"
                : tab === "UNPAID"
                ? "Unpaid"
                : "Partial"}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW: Visual High-Contrast Cards (for phone screen simplicity) */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium text-xs">
            Loading inward records...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
            <Truck className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <p className="font-bold text-slate-300">No inward loads found.</p>
            <p className="text-[11px] text-slate-500">No inward records match current filter.</p>
            <Link
              href="/purchases/new"
              className="inline-flex items-center gap-1.5 text-xs text-slate-950 font-bold bg-amber-500 px-4 py-2 rounded-xl mt-2 shadow-md"
            >
              <PlusCircle className="w-4 h-4" /> + New Inward Load
            </Link>
          </div>
        ) : (
          filteredPurchases.map((p) => {
            const isPaid = p.paymentStatus === "PAID";
            return (
              <div
                key={p._id}
                className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg active:border-amber-500/40 transition-all"
              >
                {/* Top Row: Vehicle No Badge & Slip No */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="space-y-1">
                    <div>
                      <span className="vehicle-plate text-xs">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        {p.vehicleNo}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block">{p.transportName || "Direct Transport"}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-300 block">
                      #{p.inwardNo}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(p.date)}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Vendor & Material Weight Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Vendor:</span>
                    <div className="font-extrabold text-slate-100 uppercase truncate">{p.vendorName}</div>
                    {(p.driverMobile || p.vendorMobile) && (
                      <a
                        href={`tel:${p.driverMobile || p.vendorMobile}`}
                        className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>📞 {p.driverMobile || p.vendorMobile}</span>
                        {p.driverName && <span className="text-slate-400 text-[10px]">({p.driverName})</span>}
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Material:</span>
                    <div className="font-extrabold text-amber-300 uppercase truncate">
                      {p.qty?.toFixed(2)} {p.unit} • {p.material}
                    </div>
                    {p.unloadingPoint && (
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">📍 {p.unloadingPoint}</span>
                    )}
                  </div>
                </div>

                {/* Weighbridge Details Pill */}
                {p.grossWeight > 0 && (
                  <div className="text-[11px] text-slate-300 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center justify-between font-mono">
                    <span>Gross: <strong className="text-white">{p.grossWeight}</strong></span>
                    <span className="text-slate-500">-</span>
                    <span>Tare: <strong className="text-white">{p.tareWeight}</strong></span>
                    <span className="text-slate-500">=</span>
                    <span>Net: <strong className="text-amber-400 font-bold">{p.netWeight || p.qty} {p.unit}</strong></span>
                  </div>
                )}

                {/* Cost Row */}
                <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rate: ₹{p.rate}/{p.unit}</span>
                    <div className="text-base font-black text-emerald-400">
                      ₹{formatCurrency(p.grandTotal)}
                    </div>
                  </div>

                  {/* Big Touch-Friendly Payment Button */}
                  <button
                    onClick={() => handleTogglePayment(p._id, p.paymentStatus || "UNPAID")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                      isPaid
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{isPaid ? "PAID" : "UNPAID"}</span>
                  </button>
                </div>

                {/* Bottom Action Buttons (Large Touch Targets) */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <Link
                    href={`/purchases/${p._id}`}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View</span>
                  </Link>

                  <Link
                    href={`/purchases/${p._id}/print`}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Print</span>
                  </Link>

                  {confirmDeleteId === p._id ? (
                    <div className="flex items-center gap-1 bg-red-950 border border-red-800 px-2 py-1.5 rounded-xl text-xs">
                      <span className="text-red-300 font-bold">Delete?</span>
                      <button
                        onClick={() => handleDelete(p._id)}
                        disabled={deletingId === p._id}
                        className="text-red-400 font-black underline px-1"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-slate-400 font-bold px-1"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(p._id)}
                      className="p-2.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-xl"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP VIEW: Clean ERP High-Density Table */}
      <div className="hidden md:block glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 pl-5">Inward No / Date</th>
                <th className="p-3.5">Vendor / Quarry</th>
                <th className="p-3.5">Lorry / Transport</th>
                <th className="p-3.5">Material & Tonnage</th>
                <th className="p-3.5 text-right">Rate (₹)</th>
                <th className="p-3.5 text-right">Total Cost (₹)</th>
                <th className="p-3.5 text-center">Payment Status</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500 font-medium">
                    Loading inward purchase records...
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-500">
                    <Truck className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                    <p className="font-semibold">No inward purchases found.</p>
                    <p className="text-[11px] mt-1 text-slate-600">
                      Record a new lorry load using the "New Inward Load" button above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-slate-900/40 transition-colors group"
                  >
                    {/* Inward Slip & Date */}
                    <td className="p-3.5 pl-5">
                      <Link
                        href={`/purchases/${p._id}`}
                        className="font-mono font-bold text-amber-400 hover:underline block"
                      >
                        {p.inwardNo}
                      </Link>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDate(p.date)} {p.time ? `• ${p.time}` : ""}
                      </span>
                    </td>

                    {/* Vendor Name */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200 uppercase">{p.vendorName}</div>
                      {p.vendorMobile ? (
                        <div className="text-[11px] text-slate-400">{p.vendorMobile}</div>
                      ) : null}
                    </td>

                    {/* Lorry & Transport */}
                    <td className="p-3.5">
                      <div>
                        <span className="vehicle-plate text-[11px]">
                          {p.vehicleNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {p.transportName || "Direct Transport"}
                        {p.driverName ? ` (${p.driverName})` : ""}
                      </div>
                    </td>

                    {/* Material & Quantity */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-100 uppercase">{p.material}</div>
                      <div className="text-[11px] text-slate-400">
                        <span className="text-amber-400 font-bold">{p.qty?.toFixed(2)}</span> {p.unit}
                      </div>
                    </td>

                    {/* Purchase Rate */}
                    <td className="p-3.5 text-right font-medium text-slate-300">
                      ₹{formatCurrency(p.rate)}
                      <span className="text-[10px] text-slate-500 block">/{p.unit}</span>
                    </td>

                    {/* Total Cost */}
                    <td className="p-3.5 text-right">
                      <div className="font-black text-sm text-slate-100">
                        ₹{formatCurrency(p.grandTotal)}
                      </div>
                      {p.lorryFreight && p.lorryFreight > 0 ? (
                        <span className="text-[10px] text-slate-500 block">
                          Freight: ₹{formatCurrency(p.lorryFreight)}
                        </span>
                      ) : null}
                    </td>

                    {/* Payment Status (Click to Toggle) */}
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleTogglePayment(p._id, p.paymentStatus || "UNPAID")}
                        title="Click to toggle Paid / Unpaid"
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
                          p.paymentStatus === "PAID"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/25"
                            : p.paymentStatus === "PARTIAL"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/35 hover:bg-amber-500/25"
                            : "bg-red-500/15 text-red-400 border-red-500/35 hover:bg-red-500/25"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${p.paymentStatus === "PAID" ? "bg-emerald-400" : p.paymentStatus === "PARTIAL" ? "bg-amber-400" : "bg-red-400"}`} />
                        <span>{p.paymentStatus === "PAID" ? "PAID" : p.paymentStatus === "PARTIAL" ? "PARTIAL" : "UNPAID"}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 pr-5 text-right space-x-1.5 whitespace-nowrap">
                      <Link
                        href={`/purchases/${p._id}`}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg inline-block transition-colors"
                        title="View Slip"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>

                      <Link
                        href={`/purchases/${p._id}/print`}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg inline-block transition-colors"
                        title="Print Gate Pass"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>

                      {confirmDeleteId === p._id ? (
                        <span className="inline-flex items-center space-x-1 bg-red-950/80 border border-red-800 px-2 py-1 rounded-lg text-[10px]">
                          <span className="text-red-300 font-bold">Delete?</span>
                          <button
                            onClick={() => handleDelete(p._id)}
                            disabled={deletingId === p._id}
                            className="text-red-400 hover:text-white font-black underline"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-400 hover:text-white font-bold"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(p._id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
