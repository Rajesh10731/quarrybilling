"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Search, Eye, Edit, Printer, Trash2, FileText, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function BillsListPage() {
  const router = useRouter();
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!confirm("Are you sure you want to delete this bill?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBills((prev) => prev.filter((b) => b._id !== id));
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

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-400" />
            <span>Quarry Bills & Invoices</span>
          </h1>
          <p className="text-sm text-slate-400">Search, filter, check payment status (Paid/Unpaid), and view ledger details</p>
        </div>

        <Link
          href="/bills/new"
          className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Quarry Bill</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice No, Customer Name, Vehicle No, or Transport..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 bg-slate-800 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Bills Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading bills...</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <FileText className="w-10 h-10 mx-auto text-slate-600" />
            <p>No bills found.</p>
            {search && <p className="text-xs text-slate-400">Try clearing search filters.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Billed To (Customer)</th>
                  <th className="p-3">Vehicle No</th>
                  <th className="p-3">Transport</th>
                  <th className="p-3">Total Qty</th>
                  <th className="p-3">Grand Total</th>
                  <th className="p-3">Payment Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {bills.map((bill) => {
                  const status = bill.paymentStatus || "UNPAID";
                  return (
                    <tr key={bill._id} className="hover:bg-slate-950/50 transition-colors">
                      <td className="p-3 font-bold text-amber-400">{bill.invoiceNo}</td>
                      <td className="p-3 text-slate-300">{bill.date}</td>
                      <td className="p-3 font-semibold text-white uppercase">{bill.billedTo?.name || "--"}</td>
                      <td className="p-3 font-mono text-amber-300">{bill.vehicleNo || "--"}</td>
                      <td className="p-3 text-slate-300">{bill.transport || "--"}</td>
                      <td className="p-3 text-slate-300">
                        {bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : "--"}
                      </td>
                      <td className="p-3 font-extrabold text-emerald-400">₹{formatCurrency(bill.grandTotal)}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleTogglePayment(bill._id, status)}
                          title="Click to toggle Paid/Unpaid"
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                            status === "PAID"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                              : status === "PARTIAL"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                              : "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                          }`}
                        >
                          {status === "PAID" ? "🟢 PAID" : status === "PARTIAL" ? "🟡 PARTIAL" : "🔴 UNPAID"}
                        </button>
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <Link
                          href={`/bills/${bill._id}`}
                          className="inline-flex items-center p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30 transition-colors"
                          title="Click Eye Icon to View Details & Customer Ledger Statement"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href={`/bills/${bill._id}/print`}
                          className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors"
                          title="Print Bill"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(bill._id)}
                          disabled={deletingId === bill._id}
                          className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-red-950 hover:text-red-400 text-slate-400 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
