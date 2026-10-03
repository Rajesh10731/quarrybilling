"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  Printer,
  ArrowLeft,
  Eye,
  PlusCircle,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import BillForm from "@/components/BillForm";
import BillPrintView, { BillData } from "@/components/BillPrintView";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");

  // Payments for this bill
  const [billPayments, setBillPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Modal State for adding payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  const fetchBill = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/bills/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data && !data.message) {
        setBill(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!id) return;
    setLoadingPayments(true);
    try {
      const res = await fetch(`/api/payments?billId=${id}`);
      const data = await res.json();
      if (data && Array.isArray(data.payments)) {
        setBillPayments(data.payments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    fetchBill();
    fetchPayments();
  }, [id]);

  if (loading) {
    return <div className="text-center py-24 text-slate-400">Loading bill details...</div>;
  }

  if (!bill) {
    return (
      <div className="text-center py-24 text-slate-400 space-y-4">
        <p className="text-lg">Bill not found.</p>
        <Link href="/bills" className="text-amber-400 underline">
          Return to Bills List
        </Link>
      </div>
    );
  }

  const grandTotal = bill.grandTotal || 0;
  const totalPaid = billPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceRemaining = Math.max(0, grandTotal - totalPaid);

  // Records a receipt for the whole remaining balance
  const handleMarkPaid = async () => {
    if (!bill || !bill._id) return;
    if (!confirm(`Record a Cash receipt of ₹${formatCurrency(balanceRemaining)} dated today to mark this bill fully paid?`)) return;
    try {
      const res = await fetch(`/api/bills/${bill._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markPaid: true, paymentMode: "Cash" }),
      });
      if (res.ok) {
        fetchBill();
        fetchPayments();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to mark bill as paid");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: bill._id,
          invoiceNo: bill.invoiceNo,
          customerName: bill.billedTo?.name || "Customer",
          amount: Number(paymentAmount),
          paymentMode,
          date: paymentDate,
          referenceNo: paymentRef,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentAmount("");
        setPaymentRef("");
        setPaymentNotes("");
        fetchBill();
        fetchPayments();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to record payment");
      }
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment installment?")) return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
      if (res.ok) {
        fetchBill();
        fetchPayments();
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to delete payment");
      }
    } catch (err) {
      alert("Error deleting payment");
    }
  };

  const status = (bill as any)?.paymentStatus || "UNPAID";

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl">
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => router.push("/bills")}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all shrink-0"
            title="Back to bills"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Invoice #{bill.invoiceNo}</span>
              <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                {bill.documentTitle || "BILL OF SUPPLY"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 truncate">
              Customer: <span className="text-slate-200 uppercase font-semibold">{bill.billedTo?.name}</span> | Date: {bill.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          {/* View / Edit Mode Toggle */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex text-xs">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "preview"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "edit"
                  ? "bg-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <Link
            href={`/bills/${bill._id}/print`}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </Link>
        </div>
      </div>

      {/* Payment Summary & Installments Card */}
      <div className="glass-card border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Payment Installments & Ledger</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    status === "PAID"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : status === "PARTIAL"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-red-500/10 text-red-400 border-red-500/30"
                  }`}
                >
                  {status === "PAID" ? "🟢 FULLY PAID" : status === "PARTIAL" ? "🟡 PARTIALLY PAID" : "🔴 UNPAID"}
                </span>
              </div>
              <p className="text-xs text-slate-400">Track multi-part payment entries against this bill</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPaymentAmount(balanceRemaining > 0 ? String(balanceRemaining) : String(grandTotal));
                setShowPaymentModal(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Record Payment</span>
            </button>

            {status !== "PAID" && (
              <button
                onClick={handleMarkPaid}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl border border-slate-700 transition-all"
                title="Record a receipt for the full remaining balance"
              >
                Mark Paid
              </button>
            )}

            <Link
              href={`/reports/payments?customerName=${encodeURIComponent(bill.billedTo?.name || "")}`}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold text-xs rounded-xl transition-all"
            >
              View Full Report
            </Link>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium block">Total Bill Amount</span>
            <span className="text-xl font-black text-white">₹{formatCurrency(grandTotal)}</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-emerald-400 font-medium block">Paid Amount (Received)</span>
            <span className="text-xl font-black text-emerald-400">₹{formatCurrency(totalPaid)}</span>
          </div>

          <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
            <span className="text-[11px] text-red-400 font-medium block">Balance Remaining (Due)</span>
            <span className={`text-xl font-black ${balanceRemaining > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ₹{formatCurrency(balanceRemaining)}
            </span>
          </div>
        </div>

        {/* Installments Table */}
        {billPayments.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Payment Transactions History ({billPayments.length})
            </h3>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-[11px] font-bold">
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Receipt #</th>
                    <th className="p-2.5">Mode</th>
                    <th className="p-2.5 text-right">Amount Paid</th>
                    <th className="p-2.5">Reference / Notes</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {billPayments.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-800/40">
                      <td className="p-2.5 font-medium">{formatDate(p.date)}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-400">{p.paymentNumber}</td>
                      <td className="p-2.5 font-semibold text-amber-300">{p.paymentMode}</td>
                      <td className="p-2.5 text-right font-black text-emerald-400 text-sm">
                        ₹{formatCurrency(p.amount)}
                      </td>
                      <td className="p-2.5 text-slate-400 max-w-xs truncate">
                        {p.referenceNo ? <span className="font-mono text-slate-300">{p.referenceNo} </span> : ""}
                        {p.notes || "--"}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => handleDeletePayment(p._id)}
                          className="p-1 hover:bg-red-950 text-slate-500 hover:text-red-400 rounded transition-colors"
                          title="Delete payment installment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View for Installments */}
            <div className="block sm:hidden space-y-2.5">
              {billPayments.map((p) => (
                <div
                  key={p._id}
                  className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-2"
                >
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-amber-400 text-[11px]">
                        #{p.paymentNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">{formatDate(p.date)}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[9px] font-bold text-amber-300">
                      {p.paymentMode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Amount Paid:</span>
                      <span className="font-black text-emerald-400 text-sm">₹{formatCurrency(p.amount)}</span>
                    </div>
                    <button
                      onClick={() => handleDeletePayment(p._id)}
                      className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg border border-slate-800 bg-slate-900"
                      title="Delete payment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {(p.referenceNo || p.notes) && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 truncate">
                      {p.referenceNo ? <span className="font-mono text-slate-300">{p.referenceNo} • </span> : ""}
                      {p.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area: Bill Preview or Edit */}
      {activeTab === "edit" ? (
        <BillForm initialBill={bill} isEditing={true} />
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-3 sm:p-8 rounded-3xl shadow-2xl space-y-3">
          <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <span>Exact Invoice Preview</span>
            <span className="text-[10px] text-amber-400/80 font-normal sm:hidden">• Swipe horizontally to view full receipt</span>
          </div>
          <div className="paper bg-white p-2 sm:p-6 rounded-xl shadow-inner overflow-x-auto touch-scroll">
            <BillPrintView bill={bill} />
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-400/35 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">Record Payment Installment</h3>
                <p className="text-xs text-slate-400">Bill #{bill.invoiceNo} • {bill.billedTo?.name}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Pending Balance:</span>
                <span className="font-black text-amber-400 text-sm">₹{formatCurrency(balanceRemaining)}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Received (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="any"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 10000 or 90000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-sm font-extrabold text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reference / Cheque # (Optional)
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI Ref / Cheque No"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Part payment 10,000, balance 90,000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {paymentSubmitting ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
