"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import QuotationPrintView, { QuotationData } from "@/components/QuotationPrintView";

export default function PrintQuotationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/quotations/${id}`)
      .then(async (res) => {
        if (res.status === 401) return router.push("/login");
        const data = await res.json();
        if (res.ok) setQuotation(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return <div className="text-center py-24 text-slate-400">Loading print layout...</div>;
  if (!quotation) return <div className="text-center py-24 text-slate-400">Quotation not found.</div>;

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-3 sm:p-4 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-900 border border-slate-800 p-3.5 sm:p-4 rounded-2xl print:hidden">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <button
            onClick={() => router.push(`/quotations/${quotation._id}`)}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 px-3 py-2 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Quotation
          </button>
          <div className="text-xs sm:text-sm font-bold text-amber-400">Quotation #{quotation.quotationNo}</div>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      <div className="paper bg-white p-2 sm:p-8 rounded-xl max-w-4xl mx-auto print:p-0 print:m-0 overflow-x-auto touch-scroll">
        <QuotationPrintView quotation={quotation} />
      </div>
    </div>
  );
}
