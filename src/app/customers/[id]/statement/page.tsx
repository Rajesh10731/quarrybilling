"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Printer, ArrowLeft, Calendar, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CustomerStatementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2027-03-31");

  const fetchStatement = () => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/customers/${id}/statement?fromDate=${fromDate}&toDate=${toDate}`)
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((result) => {
        if (result && !result.message) {
          setData(result);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatement();
  }, [id]);

  const handleToggleBillPayment = async (billId: string, currentStatus: string) => {
    const newStatus = currentStatus === "PAID" ? "UNPAID" : "PAID";
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });
      if (res.ok) {
        fetchStatement();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-400">Loading Customer Ledger Statement...</div>;
  }

  if (!data || !data.customer) {
    return (
      <div className="text-center py-24 text-slate-400 space-y-4">
        <p>Customer statement not found.</p>
        <Link href="/customers" className="text-amber-400 underline">
          Return to Customers
        </Link>
      </div>
    );
  }

  const { customer, rows = [], summary = {} } = data;

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-4 sm:p-6 print:p-0 print:bg-white print:text-black">
      {/* Controls Bar (Hidden in Print) */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl print:hidden shadow-xl">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/customers")}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
            title="Back to Customers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              <span>Customer Account Statement: {customer.name}</span>
            </h1>
            <p className="text-xs text-slate-400">Exact layout matching your quarry ledger format sheet</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none"
            />
            <button
              onClick={fetchStatement}
              className="ml-1 px-2 py-0.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded"
            >
              Filter
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 text-xs transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger Statement</span>
          </button>
        </div>
      </div>

      {/* Printable Statement Sheet matching exact screenshot image format */}
      <div className="bg-white text-black p-4 sm:p-8 max-w-6xl mx-auto shadow-2xl print:shadow-none print:p-0 print:m-0 font-sans text-xs">
        
        {/* Statement Box Header */}
        <div className="border border-black p-3 space-y-1 font-bold text-sm uppercase">
          <div className="flex justify-between items-center border-b border-black pb-2">
            <div>
              <span>A/c Name : </span>
              <span className="font-extrabold text-base">{customer.name},</span>
            </div>
            <div className="text-right text-xs">
              Page No: <span className="font-mono">1</span>
            </div>
          </div>
          <div className="text-xs pt-1">
            <span>Period : </span>
            <span className="font-mono font-semibold">
              {data.period?.fromDate || "01-04-2026"} TO {data.period?.toDate || "31-03-2027"}
            </span>
          </div>
        </div>

        {/* Ledger Table matching exact screenshot column order */}
        <div className="border border-t-0 border-black overflow-x-auto">
          <table className="w-full text-[11px] border-collapse text-left">
            <thead>
              <tr className="border-b border-black bg-slate-100 uppercase font-bold text-center">
                <th className="border-r border-black p-1.5 w-24">DATE</th>
                <th className="border-r border-black p-1.5 w-20">Bill No</th>
                <th className="border-r border-black p-1.5 w-28">Vehicle No</th>
                <th className="border-r border-black p-1.5">Material</th>
                <th className="border-r border-black p-1.5 w-16 text-right">Rate</th>
                <th className="border-r border-black p-1.5 w-16 text-right">Qty</th>
                <th className="border-r border-black p-1.5 w-24 text-right">Amount</th>
                <th className="border-r border-black p-1.5 w-20 text-right">Loading</th>
                <th className="border-r border-black p-1.5 w-20 text-right">Lorry Fri</th>
                <th className="border-r border-black p-1.5 w-24 text-right">Total</th>
                <th className="border-r border-black p-1.5 w-20 text-right">CREDIT</th>
                <th className="border-r border-black p-1.5 w-24 text-right">DEBIT</th>
                <th className="border-r border-black p-1.5 w-28">Delivery Place</th>
                <th className="p-1.5 w-20 print:hidden text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-slate-500 italic">
                    No ledger transactions recorded for this customer in selected period.
                  </td>
                </tr>
              ) : (
                rows.map((row: any, idx: number) => {
                  const status = row.paymentStatus || "UNPAID";
                  return (
                    <tr key={idx} className="border-b border-dashed border-slate-400 hover:bg-amber-50/50">
                      <td className="border-r border-black p-1.5 text-center font-medium">{row.date}</td>
                      <td className="border-r border-black p-1.5 text-center font-bold">
                        <Link href={`/bills/${row.billId}`} className="hover:underline text-blue-800 print:text-black">
                          {row.billNo}
                        </Link>
                      </td>
                      <td className="border-r border-black p-1.5 font-mono text-center">{row.vehicleNo}</td>
                      <td className="border-r border-black p-1.5 font-bold uppercase">{row.material}</td>
                      <td className="border-r border-black p-1.5 text-right">{row.rate ? formatCurrency(row.rate) : "--"}</td>
                      <td className="border-r border-black p-1.5 text-right font-medium">{row.qty ? Number(row.qty).toFixed(2) : "--"}</td>
                      <td className="border-r border-black p-1.5 text-right">{row.amount ? formatCurrency(row.amount) : "0.00"}</td>
                      <td className="border-r border-black p-1.5 text-right">{row.loading ? formatCurrency(row.loading) : "--"}</td>
                      <td className="border-r border-black p-1.5 text-right">{row.lorryFri ? formatCurrency(row.lorryFri) : "--"}</td>
                      <td className="border-r border-black p-1.5 text-right font-bold">{row.total ? formatCurrency(row.total) : "0.00"}</td>
                      <td className="border-r border-black p-1.5 text-right font-semibold text-emerald-700">{row.credit ? formatCurrency(row.credit) : "--"}</td>
                      <td className="border-r border-black p-1.5 text-right font-bold">{row.debit ? formatCurrency(row.debit) : "--"}</td>
                      <td className="border-r border-black p-1.5 font-semibold uppercase">{row.deliveryPlace || "--"}</td>
                      <td className="p-1.5 print:hidden text-center">
                        <button
                          onClick={() => handleToggleBillPayment(row.billId, status)}
                          title="Click to toggle Paid / Unpaid"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border transition-all ${
                            status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-400 hover:bg-emerald-200"
                              : status === "PARTIAL"
                              ? "bg-amber-100 text-amber-800 border-amber-400 hover:bg-amber-200"
                              : "bg-red-100 text-red-800 border-red-400 hover:bg-red-200"
                          }`}
                        >
                          {status}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Ledger Footer Summary */}
        <div className="border border-t-0 border-black p-4 space-y-2 font-bold text-xs bg-slate-50">
          <div className="flex justify-between items-center border-b border-slate-300 pb-2">
            <span className="uppercase tracking-wider">Grand Total</span>
            <div className="space-x-8 font-extrabold text-sm">
              <span>DEBIT: ₹{formatCurrency(summary.totalDebit || 0)}</span>
              <span>CREDIT: ₹{formatCurrency(summary.totalCredit || 0)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center pt-1 text-sm">
            <span className="uppercase text-slate-800">Closing Balance (Outstanding)</span>
            <span className={`font-extrabold text-base underline ${summary.closingBalance > 0 ? "text-red-700" : "text-emerald-700"}`}>
              ₹{formatCurrency(summary.closingBalance || 0)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
