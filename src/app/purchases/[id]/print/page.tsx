"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import PurchasePrintView, { PurchaseData } from "@/components/PurchasePrintView";

export default function PrintPurchasePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [purchase, setPurchase] = useState<PurchaseData | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/purchases/${id}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([purchaseData, settingsData]) => {
        if (purchaseData && !purchaseData.message) {
          setPurchase(purchaseData);
        }
        if (settingsData && !settingsData.message) {
          setSettings(settingsData);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-400">Loading print layout...</div>;
  }

  if (!purchase) {
    return <div className="text-center py-24 text-slate-400">Inward voucher not found.</div>;
  }

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 sm:p-4 print:p-0 print:bg-white">
      {/* Floating Control Header (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl print:hidden shadow-2xl">
        <div className="flex items-center justify-between sm:justify-start space-x-2">
          <button
            onClick={() => router.push(`/purchases/${purchase._id}`)}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Inward Slip</span>
          </button>

          <div className="text-xs sm:text-sm font-bold text-amber-400 truncate">
            #{purchase.inwardNo} ({purchase.vehicleNo})
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Slip / Save PDF</span>
        </button>
      </div>

      {/* Render Printable Receipt */}
      <div className="overflow-x-auto touch-scroll">
        <PurchasePrintView
          purchase={purchase}
          companyName={settings?.companyName}
          companyGstin={settings?.companyGstin}
          companyAddress={settings?.companyAddress}
          companyMobile={settings?.companyMobile}
        />
      </div>
    </div>
  );
}
