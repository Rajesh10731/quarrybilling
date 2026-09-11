"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Eye,
  Printer,
  Trash2,
  FileText,
  Truck,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  DollarSign,
  Scale,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BillsListPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "PARTIAL">("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchBills = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bills?query=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBills((prev) => prev.filter((b) => b._id !== id));
        setConfirmDeleteId(null);
      } else {
        alert("Failed to delete bill");
      }
    } catch (err) {
      alert("Error deleting bill");
    } finally {
      setDeletingId(null);
    }
  };

  const handleTogglePayment = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (res.ok) {
        setBills((prev) =>
          prev.map((b) => (b._id === id ? { ...b, paymentStatus: newStatus } : b))
        );
      }
    } catch (err) {
      console.error("Failed to update payment status", err);
    }
  };

  // Filter bills based on selected tab
  const filteredBills = useMemo(() => {
    if (statusFilter === "ALL") return bills;
    return bills.filter((b) => (b.paymentStatus || "UNPAID") === statusFilter);
  }, [bills, statusFilter]);

  // Aggregate stats
  const totalBilledVal = useMemo(
    () => bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    [bills]
  );
  const unpaidCount = useMemo(
    () => bills.filter((b) => (b.paymentStatus || "UNPAID") === "UNPAID").length,
    [bills]
  );
  const paidCount = useMemo(
    () => bills.filter((b) => b.paymentStatus === "PAID").length,
    [bills]
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            <span>Quarry Sales Bills & Invoices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Outward client dispatches, lorry consignments, and invoice receipts
          </p>
        </div>

        <Link
          href="/bills/new"
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs sm:text-sm active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Create New Bill</span>
        </Link>
      </div>

      {/* Summary Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Bills
            </span>
            <div className="text-xl sm:text-3xl font-black text-white">{bills.length}</div>
            <div className="text-[10px] text-slate-500">Showing {filteredBills.length} records</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Billed
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              ₹{formatCurrency(totalBilledVal)}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold">{paidCount} bills cleared</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="glass-card p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Pending Due
            </span>
            <div className="text-lg sm:text-2xl font-black text-red-400">{unpaidCount} Bills</div>
            <div className="text-[10px] text-red-400 font-semibold">Outstanding balance</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Search & Status Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer, vehicle no..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Status Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80 w-full sm:w-auto overflow-x-auto touch-scroll">
          {(["ALL", "PAID", "UNPAID", "PARTIAL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab === "ALL"
                ? `All (${bills.length})`
                : tab === "PAID"
                ? `Paid (${paidCount})`
                : tab === "UNPAID"
                ? `Unpaid (${unpaidCount})`
                : `Partial`}
            </button>
          ))}
        </div>
      </div>

      {/* MOBILE VIEW: Visual High-Contrast Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium text-xs">
            Loading bills...
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
            <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <p className="font-bold text-slate-300">No matching bills found.</p>
            <p className="text-[11px] text-slate-500">Try changing your search query or filter.</p>
            <Link
              href="/bills/new"
              className="inline-flex items-center gap-1.5 text-xs text-slate-950 font-bold bg-amber-500 px-4 py-2 rounded-xl mt-2"
            >
              <PlusCircle className="w-4 h-4" /> + Create Bill
            </Link>
          </div>
        ) : (
          filteredBills.map((bill) => {
            const isPaid = bill.paymentStatus === "PAID";
            return (
              <div
                key={bill._id}
                className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg"
              >
                {/* Top Row: Invoice # & Vehicle No */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div>
                    <span className="font-mono text-xs font-black text-amber-400 block">
                      #{bill.invoiceNo}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {bill.date}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end">
                      <span className="vehicle-plate text-xs">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        {bill.vehicleNo || "--"}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1">{bill.transport || "Direct Transport"}</span>
                  </div>
                </div>

                {/* Middle: Customer & Quantity */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer:</span>
                    <div className="font-black text-white uppercase truncate flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{bill.billedTo?.name || "--"}</span>
                    </div>
                    {bill.billedTo?.mobile && (
                      <a
                        href={`tel:${bill.billedTo.mobile}`}
                        className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                      >
                        <span>📞 {bill.billedTo.mobile}</span>
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Weight:</span>
                    <div className="font-black text-slate-200 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : "--"}</span>
                    </div>
                    {bill.deliveryPlace && (
                      <span className="text-[10px] text-slate-400 truncate block mt-0.5">📍 {bill.deliveryPlace}</span>
                    )}
                  </div>
                </div>

                {/* Cost Row & Payment Button */}
                <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Grand Total:</span>
                    <div className="text-base font-black text-emerald-400">
                      ₹{formatCurrency(bill.grandTotal)}
                    </div>
                  </div>

                  <button
                    onClick={() => handleTogglePayment(bill._id, bill.paymentStatus || "UNPAID")}
                    className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                      isPaid
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                        : "bg-red-500/20 text-red-400 border-red-500/40"
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{isPaid ? "PAID" : "UNPAID"}</span>
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                  <Link
                    href={`/bills/${bill._id}`}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>View</span>
                  </Link>

                  <Link
                    href={`/bills/${bill._id}/print`}
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </Link>

                  {confirmDeleteId === bill._id ? (
                    <div className="flex items-center gap-1 bg-red-950 border border-red-800 px-2 py-1.5 rounded-xl text-xs">
                      <span className="text-red-300 font-bold">Delete?</span>
                      <button
                        onClick={() => handleDelete(bill._id)}
                        disabled={deletingId === bill._id}
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
                      onClick={() => setConfirmDeleteId(bill._id)}
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

      {/* DESKTOP VIEW: Table Container */}
      <div className="hidden md:block glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-semibold">Loading quarry bills...</div>
        ) : filteredBills.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-400">No matching bills found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-950/40">
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Billed To (Customer)</th>
                  <th className="p-3.5">Vehicle No.</th>
                  <th className="p-3.5">Transport</th>
                  <th className="p-3.5">Material Qty</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5">Payment Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredBills.map((bill) => {
                  const status = bill.paymentStatus || "UNPAID";
                  return (
                    <tr key={bill._id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="p-3.5 font-extrabold text-amber-400">{bill.invoiceNo}</td>
                      <td className="p-3.5 text-slate-300 font-medium">{bill.date}</td>
                      <td className="p-3.5 font-bold text-white uppercase tracking-tight">{bill.billedTo?.name || "--"}</td>
                      <td className="p-3.5">
                        <span className="vehicle-plate text-[11px]">
                          {bill.vehicleNo || "--"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-300 font-medium">{bill.transport || "--"}</td>
                      <td className="p-3.5 text-slate-300 font-semibold">
                        {bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : "--"}
                      </td>
                      <td className="p-3.5 font-black text-emerald-400 text-sm">₹{formatCurrency(bill.grandTotal)}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => handleTogglePayment(bill._id, status)}
                          title="Click to toggle Paid/Unpaid"
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                            status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/25"
                              : status === "PARTIAL"
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/35 hover:bg-amber-500/25"
                              : "bg-red-500/15 text-red-400 border-red-500/35 hover:bg-red-500/25"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${status === "PAID" ? "bg-emerald-400" : status === "PARTIAL" ? "bg-amber-400" : "bg-red-400"}`} />
                          <span>{status === "PAID" ? "PAID" : status === "PARTIAL" ? "PARTIAL" : "UNPAID"}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/bills/${bill._id}`}
                          className="inline-flex items-center p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition-colors"
                          title="View Bill & Customer Ledger"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/bills/${bill._id}/print`}
                          className="inline-flex items-center p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 transition-colors"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                        {confirmDeleteId === bill._id ? (
                          <span className="inline-flex items-center space-x-1 bg-red-950/80 border border-red-800 px-2 py-1 rounded-lg text-[10px]">
                            <span className="text-red-300 font-bold">Delete?</span>
                            <button
                              onClick={() => handleDelete(bill._id)}
                              disabled={deletingId === bill._id}
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
                            onClick={() => setConfirmDeleteId(bill._id)}
                            className="inline-flex items-center p-2 bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-colors"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
