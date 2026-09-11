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
  DollarSign,
  Calendar,
  X,
  Truck,
  Building2,
  Scale,
} from "lucide-react";
import PurchasePrintView, { PurchaseData } from "@/components/PurchasePrintView";
import PurchaseForm from "@/components/PurchaseForm";
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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase) return;

    setSubmittingPayment(true);
    try {
      const addAmount = parseFloat(paymentAmount) || 0;
      const currentPaid = purchase.paidAmount || 0;
      const newTotalPaid = currentPaid + addAmount;
      const newStatus =
        newTotalPaid >= purchase.grandTotal ? "PAID" : newTotalPaid > 0 ? "PARTIAL" : "UNPAID";

      const res = await fetch(`/api/purchases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paidAmount: newTotalPaid,
          paymentStatus: newStatus,
          paymentMode,
          paymentDate,
          paymentRef,
          notes: paymentNotes || purchase.notes,
        }),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        fetchPurchase();
      } else {
        alert("Failed to update payment");
      }
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
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
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
          >
            <DollarSign className="w-4 h-4" />
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
                  <DollarSign className="w-5 h-5 text-amber-400" />
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
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-emerald-500/20 transition-all"
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
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-black text-lg">
                <DollarSign className="w-5 h-5 text-emerald-400" />
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
