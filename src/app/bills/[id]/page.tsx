"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Printer, ArrowLeft, Eye } from "lucide-react";
import BillForm from "@/components/BillForm";
import BillPrintView, { BillData } from "@/components/BillPrintView";

export default function BillDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("preview");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bills/${id}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && !data.message) {
          setBill(data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, router]);

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

  const handleUpdatePaymentStatus = async (newStatus: "UNPAID" | "PAID" | "PARTIAL") => {
    if (!bill || !bill._id) return;
    try {
      const res = await fetch(`/api/bills/${bill._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (res.ok) {
        setBill({ ...bill, paymentStatus: newStatus } as any);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const status = (bill as any)?.paymentStatus || "UNPAID";

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/bills")}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            title="Back to bills"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Invoice #{bill.invoiceNo}</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
                {bill.documentTitle || "BILL OF SUPPLY"}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Customer: <span className="text-slate-200 uppercase font-semibold">{bill.billedTo?.name}</span> | Date: {bill.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              <span>Bill Preview</span>
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
              <span>Edit Bill</span>
            </button>
          </div>

          <Link
            href={`/bills/${bill._id}/print`}
            className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </Link>
        </div>
      </div>

      {/* Payment Status Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-medium">Bill Payment Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold border ${
              status === "PAID"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : status === "PARTIAL"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            {status === "PAID" ? "🟢 PAID" : status === "PARTIAL" ? "🟡 PARTIAL" : "🔴 UNPAID"}
          </span>
          <span className="text-xs text-slate-400">
            (Amount: ₹{bill.grandTotal ? bill.grandTotal.toLocaleString('en-IN') : "0"})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {status !== "PAID" ? (
            <button
              onClick={() => handleUpdatePaymentStatus("PAID")}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
            >
              Mark as Paid
            </button>
          ) : (
            <button
              onClick={() => handleUpdatePaymentStatus("UNPAID")}
              className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 font-bold text-xs rounded-xl border border-red-800 transition-all"
            >
              Mark as Unpaid
            </button>
          )}

          <Link
            href="/customers"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-semibold text-xs rounded-xl transition-all"
          >
            View Customer Ledger Statement
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "edit" ? (
        <BillForm initialBill={bill} isEditing={true} />
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-4 sm:p-8 rounded-3xl shadow-2xl space-y-4">
          <div className="text-center text-xs text-slate-400 mb-2">
            Exact Invoice Preview
          </div>
          <div className="bg-white p-2 sm:p-6 rounded-xl shadow-inner overflow-x-auto">
            <BillPrintView bill={bill} />
          </div>
        </div>
      )}
    </div>
  );
}
