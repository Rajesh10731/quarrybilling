"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, CheckCircle2, Edit, Eye, Printer, RotateCcw, Trash2, X, XCircle } from "lucide-react";
import QuotationForm from "@/components/QuotationForm";
import QuotationPrintView, { QuotationData } from "@/components/QuotationPrintView";
import QuotationStatusBadge from "@/components/QuotationStatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const [busy, setBusy] = useState(false);

  // Convert-to-bill dialog
  const [showConvert, setShowConvert] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleNo, setVehicleNo] = useState("");
  const [convertError, setConvertError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/quotations/${id}`)
      .then(async (res) => {
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        setQuotation(res.ok ? data : null);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, router]);

  const setStatus = async (status: "OPEN" | "ACCEPTED" | "REJECTED") => {
    setBusy(true);
    const res = await fetch(`/api/quotations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setQuotation(data);
    else alert(data.message || "Failed to update status");
    setBusy(false);
  };

  const openConvert = async () => {
    setConvertError("");
    setShowConvert(true);
    try {
      const data = await (await fetch("/api/bills?nextInvoiceNo=1")).json();
      if (data?.invoiceNo) setInvoiceNo(data.invoiceNo);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setConvertError("");
    const res = await fetch(`/api/quotations/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceNo, date: billDate, vehicleNo }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.bill?._id) {
      router.push(`/bills/${data.bill._id}`);
    } else {
      setConvertError(data.message || "Failed to convert quotation");
    }
  };

  const handleDelete = async () => {
    if (!quotation || !confirm(`Delete quotation ${quotation.quotationNo}?`)) return;
    const res = await fetch(`/api/quotations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) router.push("/quotations");
    else alert(data.message || "Failed to delete quotation");
  };

  if (loading) return <div className="text-center py-24 text-slate-400">Loading quotation...</div>;
  if (!quotation) {
    return (
      <div className="text-center py-24 text-slate-400 space-y-4">
        <p>Quotation not found.</p>
        <Link href="/quotations" className="text-amber-400 underline">Back to Quotations</Link>
      </div>
    );
  }

  const converted = quotation.status === "CONVERTED";
  const btn = "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all disabled:opacity-50";

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/quotations")} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl" title="Back to quotations">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
              <span>Quotation #{quotation.quotationNo}</span>
              <QuotationStatusBadge status={quotation.displayStatus} />
            </h1>
            <p className="text-xs text-slate-400 truncate">
              {quotation.customer?.name} · {formatDate(quotation.date)} · valid until {formatDate(quotation.validUntil)} · ₹{formatCurrency(quotation.grandTotal || 0)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!converted && (
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button onClick={() => setTab("preview")} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "preview" ? "bg-slate-800 text-white" : "text-slate-400"}`}>
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={() => setTab("edit")} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${tab === "edit" ? "bg-slate-800 text-white" : "text-slate-400"}`}>
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          )}
          <Link href={`/quotations/${id}/print`} className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700`}>
            <Printer className="w-4 h-4" /> Print / PDF
          </Link>
          {converted ? (
            <Link href={`/bills/${quotation.convertedBillId}`} className={`${btn} bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-500`}>
              View Invoice {quotation.convertedInvoiceNo}
            </Link>
          ) : (
            <>
              {quotation.status !== "ACCEPTED" && quotation.status !== "REJECTED" && (
                <button disabled={busy} onClick={() => setStatus("ACCEPTED")} className={`${btn} bg-emerald-500/15 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/25`}>
                  <CheckCircle2 className="w-4 h-4" /> Mark Accepted
                </button>
              )}
              {quotation.status !== "REJECTED" && (
                <button disabled={busy} onClick={() => setStatus("REJECTED")} className={`${btn} bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20`}>
                  <XCircle className="w-4 h-4" /> Mark Rejected
                </button>
              )}
              {quotation.status !== "OPEN" && (
                <button disabled={busy} onClick={() => setStatus("OPEN")} className={`${btn} bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700`}>
                  <RotateCcw className="w-4 h-4" /> Reopen
                </button>
              )}
              {quotation.status !== "REJECTED" && (
                <button disabled={busy} onClick={openConvert} className={`${btn} bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-500`}>
                  <ArrowRightLeft className="w-4 h-4" /> Convert to Bill
                </button>
              )}
              <button disabled={busy} onClick={handleDelete} title="Delete quotation" className={`${btn} bg-slate-800 text-red-400 border-slate-700 hover:bg-red-950`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {converted && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
          This quotation was converted to invoice <strong>{quotation.convertedInvoiceNo}</strong>. It is kept for reference and can no longer be edited.
        </div>
      )}

      {tab === "edit" && !converted ? (
        <QuotationForm
          initialQuotation={quotation}
          isEditing
          onSaved={(saved) => {
            setQuotation(saved);
            setTab("preview");
          }}
        />
      ) : (
        <div className="glass-card rounded-3xl p-3 sm:p-6 border border-slate-800">
          <div className="paper bg-white p-2 sm:p-6 rounded-xl overflow-x-auto touch-scroll">
            <QuotationPrintView quotation={quotation} />
          </div>
        </div>
      )}

      {/* Convert to bill dialog */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400/35 backdrop-blur-[2px] p-4 soft-fade-in">
          <form onSubmit={handleConvert} className="glass-card w-full max-w-md rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-white">Convert to Sales Bill</h2>
                <p className="text-xs text-slate-400">Creates an UNPAID bill for {quotation.customer?.name} with the same items and rates (₹{formatCurrency(quotation.grandTotal || 0)}).</p>
              </div>
              <button type="button" onClick={() => setShowConvert(false)} className="p-1 text-slate-400 hover:text-white" title="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            {convertError && <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-300 text-xs">{convertError}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Invoice No. *</label>
                <input required value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Bill Date *</label>
                <input required type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle No. (optional)</label>
                <input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value.toUpperCase())} placeholder="e.g. TN 74 BK 6973" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowConvert(false)} className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-50">
                {busy ? "Creating bill..." : "Create Bill"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
