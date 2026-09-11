"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Printer, ArrowLeft } from "lucide-react";
import BillPrintView, { BillData } from "@/components/BillPrintView";

export default function PrintBillPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [bill, setBill] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/bills/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.message) {
          setBill(data);
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

  if (!bill) {
    return <div className="text-center py-24 text-slate-400">Bill not found.</div>;
  }

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 sm:p-4 print:p-0 print:bg-white">
      {/* Floating Control Header (Hidden in Print) */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl print:hidden shadow-2xl">
        <div className="flex items-center justify-between sm:justify-start space-x-2">
          <button
            onClick={() => router.push(`/bills/${bill._id}`)}
            className="flex items-center space-x-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Bill</span>
          </button>

          <div className="text-xs sm:text-sm font-bold text-amber-400">
            Invoice #{bill.invoiceNo}
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Print Receipt / Save PDF</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-2 sm:p-8 rounded-xl max-w-4xl mx-auto shadow-2xl print:shadow-none print:p-0 print:m-0 overflow-x-auto touch-scroll">
        <BillPrintView bill={bill} />
      </div>
    </div>
  );
}
