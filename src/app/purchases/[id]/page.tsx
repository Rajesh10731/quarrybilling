"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  Printer,
  ArrowLeft,
  Eye,
  CheckCircle2,
  IndianRupee,
  Calendar,
  X,
  Truck,
  Building2,
  Scale,
} from "lucide-react";
import PurchasePrintView, { PurchaseData } from "@/components/PurchasePrintView";
import PurchaseForm from "@/components/PurchaseForm";
import SaleStatusBadge from "@/components/SaleStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PurchaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"preview" | "edit">("preview");

  // Payment Settlement Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchPurchase = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/purchases/${id}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      if (data && !data.message) {
        setPurchase(data);
        setPaymentAmount(String(Math.max(0, (data.grandTotal || 0) - (data.paidAmount || 0))));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchase();
    // Load company settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error(err));
  }, [id]);

  // Adds one installment to the payment history; the server refuses overpayment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/purchases/${id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(paymentAmount) || 0,
          mode: paymentMode,
          date: paymentDate,
          ref: paymentRef,
          notes: paymentNotes,
        }),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentRef("");
        setPaymentNotes("");
        fetchPurchase();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to record payment");
      }
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Delete this payment installment? The balance payable will increase.")) return;
    const res = await fetch(`/api/purchases/${id}/payments?paymentId=${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      fetchPurchase();
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.message || "Failed to delete payment");
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-400">
        Loading inward purchase voucher...
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-slate-400 space-y-4">
        <p>Inward purchase entry not found.</p>
        <Link
          href="/purchases"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inward Purchases</span>
        </Link>
      </div>
    );
  }

  const pendingAmount = Math.max(0, (purchase.grandTotal || 0) - (purchase.paidAmount || 0));
  const trade = purchase.trade;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/80 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            href="/purchases"
            className="p-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-white rounded-xl transition-all shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg sm:text-2xl font-black text-amber-400 font-mono">
                {purchase.inwardNo}
              </span>
              <span
                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                  purchase.paymentStatus === "PAID"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : purchase.paymentStatus === "PARTIAL"
                    ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {purchase.paymentStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate">
              Lorry: <strong className="text-slate-200">{purchase.vehicleNo}</strong> • Vendor:{" "}
              <strong className="text-slate-200">{purchase.vendorName}</strong>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
          {/* Tab Switcher */}
          <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("preview")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "preview"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "edit"
                  ? "bg-amber-500 text-slate-950"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            disabled={pendingAmount <= 0}
            title={pendingAmount <= 0 ? "Fully paid, nothing pending" : "Record a payment to the vendor"}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
          >
            <IndianRupee className="w-4 h-4" />
            <span className="hidden sm:inline">Record Payment</span>
            <span className="sm:hidden">Pay</span>
          </button>

          <Link
            href={`/purchases/${purchase._id}/print`}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Link>
        </div>
      </div>

      {activeTab === "edit" ? (
        <PurchaseForm initialPurchase={purchase} isEditing={true} />
      ) : (
        <div className="space-y-6">
          {/* Printable Receipt Paper Container */}
          <div className="bg-slate-900/60 p-2.5 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl overflow-x-auto touch-scroll">
            <div className="text-center text-xs text-slate-400 pb-2 flex items-center justify-center gap-1.5 sm:hidden">
              <span>Weighbridge Inward Slip</span>
              <span className="text-[10px] text-amber-400/80 font-normal">• Swipe horizontally to view full slip</span>
            </div>
            <PurchasePrintView
              purchase={purchase}
              companyName={settings?.companyName}
              companyGstin={settings?.companyGstin}
              companyAddress={settings?.companyAddress}
              companyMobile={settings?.companyMobile}
            />
          </div>

          {/* Payment & Settlement Summary Card */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-amber-400" />
                  <span>Settlement Status with {purchase.vendorName}</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Total purchase cost: ₹{formatCurrency(purchase.grandTotal)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 uppercase font-bold block">
                    Pending Payable:
                  </span>
                  <span
                    className={`text-lg font-black ${
                      pendingAmount > 0 ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    ₹{formatCurrency(pendingAmount)}
                  </span>
                </div>

                {pendingAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-2 bg-emerald-400 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all"
                  >
                    Clear Balance
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-slate-500 block">Total Material Cost:</span>
                <span className="font-bold text-slate-200">
                  ₹{formatCurrency(purchase.materialAmount)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Lorry Freight Charge:</span>
                <span className="font-bold text-slate-200">
                  ₹{formatCurrency(purchase.lorryFreight || 0)} ({purchase.freightPaidBy})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Amount Paid So Far:</span>
                <span className="font-bold text-emerald-400">
                  ₹{formatCurrency(purchase.paidAmount || 0)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Payment Mode / Ref:</span>
                <span className="font-bold text-slate-200">
                  {purchase.paymentMode || "Cash"} {purchase.paymentRef ? `(${purchase.paymentRef})` : ""}
                </span>
              </div>
            </div>

            {/* Trade margin: sales from this load (bought and sold on directly, no stock) */}
            <div className="pt-4 mt-4 border-t border-slate-800 space-y-3">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Trade Margin</h3>
                <SaleStatusBadge status={purchase.saleStatus} soldQty={purchase.soldQty} qty={purchase.qty} unit={purchase.unit} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {[
                  ["Bought", `${purchase.qty} ${purchase.unit}`, "text-slate-200"],
                  ["Sold", `${purchase.soldQty || 0} ${purchase.unit}`, "text-emerald-400"],
                  ["Left to sell", `${purchase.remainingQty ?? purchase.qty} ${purchase.unit}`, "text-amber-400"],
                  ["Income", `₹${formatCurrency(trade?.income || 0)}`, "text-slate-200"],
                  ["Cost", `₹${formatCurrency(trade?.cost || 0)}`, "text-slate-200"],
                  [
                    (trade?.profit || 0) < 0 ? "Loss" : "Margin",
                    `${(trade?.profit || 0) < 0 ? "−" : ""}₹${formatCurrency(Math.abs(trade?.profit || 0))}${trade?.income ? ` (${trade.marginPct}%)` : ""}`,
                    (trade?.profit || 0) < 0 ? "text-red-400" : "text-emerald-400",
                  ],
                ].map(([label, value, color]) => (
                  <div key={label} className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">{label}</span>
                    <span className={`block font-black ${color}`}>{value}</span>
                  </div>
                ))}
              </div>
              {(purchase.sales || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">Not sold yet. Use “Sell from Purchase” on a new sales bill.</p>
              ) : (
                <div className="overflow-x-auto touch-scroll">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 uppercase text-[10px] border-b border-slate-800">
                        <th className="py-2 pr-3">Invoice</th>
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Customer</th>
                        <th className="py-2 pr-3 text-right">Qty</th>
                        <th className="py-2 pr-3 text-right">Rate</th>
                        <th className="py-2 pr-3 text-right">Income</th>
                        <th className="py-2 pr-3 text-right">Cost</th>
                        <th className="py-2 text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(purchase.sales || []).map((s, i) => (
                        <tr key={`${s.billId}-${i}`}>
                          <td className="py-2 pr-3">
                            <Link href={`/bills/${s.billId}`} className="font-bold text-amber-400 hover:underline">{s.invoiceNo}</Link>
                          </td>
                          <td className="py-2 pr-3 text-slate-300">{formatDate(s.date)}</td>
                          <td className="py-2 pr-3 text-slate-200 uppercase">{s.customer}</td>
                          <td className="py-2 pr-3 text-right text-slate-300">{s.qty} {s.unit}</td>
                          <td className="py-2 pr-3 text-right text-slate-300">₹{formatCurrency(s.rate)}</td>
                          <td className="py-2 pr-3 text-right text-slate-200">₹{formatCurrency(s.income)}</td>
                          <td className="py-2 pr-3 text-right text-slate-300">₹{formatCurrency(s.cost)}</td>
                          <td className={`py-2 text-right font-bold ${s.profit < 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {s.profit < 0 ? "−" : ""}₹{formatCurrency(Math.abs(s.profit))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Payment history: every installment paid to the vendor */}
            <div className="pt-4 mt-4 border-t border-slate-800">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Payment History</h3>
                {pendingAmount > 0 && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
                  >
                    + Add Payment
                  </button>
                )}
              </div>
              {(purchase.payments || []).length === 0 ? (
                <p className="text-xs text-slate-500 italic">No payments recorded yet.</p>
              ) : (
                <div className="overflow-x-auto touch-scroll">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500 uppercase text-[10px] border-b border-slate-800">
                        <th className="py-2 pr-3">Date</th>
                        <th className="py-2 pr-3">Mode</th>
                        <th className="py-2 pr-3">Ref / UTR</th>
                        <th className="py-2 pr-3">Notes</th>
                        <th className="py-2 pr-3 text-right">Amount</th>
                        <th className="py-2 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(purchase.payments as any[]).map((p) => (
                        <tr key={p._id}>
                          <td className="py-2 pr-3 text-slate-300">{formatDate(p.date)}</td>
                          <td className="py-2 pr-3 text-slate-300">{p.mode}</td>
                          <td className="py-2 pr-3 text-slate-400">{p.ref || "--"}</td>
                          <td className="py-2 pr-3 text-slate-400">{p.notes || "--"}</td>
                          <td className="py-2 pr-3 text-right font-bold text-emerald-400">₹{formatCurrency(p.amount)}</td>
                          <td className="py-2 text-right">
                            <button
                              onClick={() => handleDeletePayment(p._id)}
                              className="px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950 text-[11px] font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400/35 backdrop-blur-[2px] p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-black text-lg">
                <IndianRupee className="w-5 h-5 text-emerald-400" />
                <span>Record Vendor Payment</span>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Vendor:</span>
                <span className="font-bold text-slate-200">{purchase.vendorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Purchase Value:</span>
                <span className="font-bold text-slate-200">₹{formatCurrency(purchase.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Already Paid:</span>
                <span className="font-bold text-emerald-400">₹{formatCurrency(purchase.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-black text-amber-400">₹{formatCurrency(pendingAmount)}</span>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Payment Amount to Add (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-base text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT)</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reference / UTR / Cheque Number
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Optional reference no"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Paid via quarry account"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                >
                  {submittingPayment ? "Updating..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
