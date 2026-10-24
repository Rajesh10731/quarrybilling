"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Calendar,
  Building2,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  MapPin,
  IndianRupee,
  Scale,
  Eye,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function VendorStatementPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatement = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/vendors/${id}`).then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([vendorData, settingsData]) => {
        if (vendorData && !vendorData.message) {
          setData(vendorData);
        }
        if (settingsData && !settingsData.message) {
          setSettings(settingsData);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatement();
  }, [id]);


  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto p-12 text-center text-slate-400">
        Loading vendor statement & inward history...
      </div>
    );
  }

  if (!data || !data.vendor) {
    return (
      <div className="max-w-[1600px] mx-auto p-12 text-center text-slate-400 space-y-4">
        <p>Vendor details not found.</p>
        <Link
          href="/vendors"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vendors Directory</span>
        </Link>
      </div>
    );
  }

  const { vendor, purchases, summary } = data;

  return (
    <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header Controls (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-xl print:hidden">
        <div className="flex items-center space-x-3">
          <Link
            href="/vendors"
            className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-amber-400" />
              <span>{vendor.name}</span>
            </h1>
            <p className="text-xs text-slate-400">
              Vendor Inward Statement & Lorry Load Purchase Ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/purchases/new"
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Record New Inward Load</span>
          </Link>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Screen View) */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 print:hidden">
        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Total Inward Loads
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {summary.totalPurchases || 0} Loads
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Total Purchased Value
          </span>
          <div className="text-2xl font-black text-slate-100 mt-1">
            ₹{formatCurrency(summary.totalAmount || 0)}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Total Paid So Far
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            ₹{formatCurrency(summary.totalPaid || 0)}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800">
          <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">
            Pending Balance Owed
          </span>
          <div
            className={`text-2xl font-black mt-1 ${
              summary.pendingBalance > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            ₹{formatCurrency(summary.pendingBalance || 0)}
          </div>
          {summary.openingBalance ? (
            <div className="text-[10px] text-slate-500 mt-1">incl. opening balance ₹{formatCurrency(summary.openingBalance)}</div>
          ) : null}
        </div>
      </div>

      {/* Printable Sheet Layout */}
      <div className="paper bg-white text-black p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-2xl print:border-none print:p-0 print:shadow-none font-sans text-xs">
        {/* Company Header */}
        <div className="border-b-2 border-black pb-4 text-center">
          <div className="text-2xl font-black uppercase tracking-wider">
            {settings?.companyName || "QUARRY OPERATIONS & MINES"}
          </div>
          {settings?.companyAddress && (
            <div className="text-xs text-slate-700 mt-0.5">{settings.companyAddress}</div>
          )}
          <div className="text-[11px] text-slate-600 flex justify-center gap-4 mt-1">
            {settings?.companyGstin && <span><strong>GSTIN:</strong> {settings.companyGstin}</span>}
            {settings?.companyMobile && <span><strong>Ph:</strong> {settings.companyMobile}</span>}
          </div>
          <div className="mt-2 text-sm font-black uppercase tracking-widest underline">
            VENDOR PURCHASE & INWARD LORRY STATEMENT
          </div>
        </div>

        {/* Vendor Summary Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 py-4 border-b border-black text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              Vendor / Supplier:
            </span>
            <div className="text-base font-black uppercase text-black">{vendor.name}</div>
            {vendor.quarryLocation && (
              <div className="text-slate-700"><strong>Source Quarry:</strong> {vendor.quarryLocation}</div>
            )}
            {vendor.address && <div className="text-slate-700">{vendor.address}</div>}
            {vendor.mobile && <div><strong>Mobile:</strong> {vendor.mobile}</div>}
            {vendor.gstin && <div><strong>GSTIN:</strong> {vendor.gstin}</div>}
          </div>

          <div className="text-left sm:text-right print:text-right space-y-1">
            <div className="text-slate-600">
              <strong>Statement Date:</strong> {new Date().toLocaleDateString("en-IN")}
            </div>
            <div>
              <strong>Total Lorry Loads Received:</strong> {purchases.length}
            </div>
            {summary.openingBalance ? (
              <div>
                <strong>Opening Balance:</strong> ₹{formatCurrency(summary.openingBalance)}
              </div>
            ) : null}
            <div>
              <strong>Total Purchased Amount:</strong> ₹{formatCurrency(summary.totalAmount)}
            </div>
            <div>
              <strong>Amount Paid:</strong> ₹{formatCurrency(summary.totalPaid)}
            </div>
            <div className="text-sm font-black text-black pt-1">
              <strong>BALANCE PAYABLE:</strong> ₹{formatCurrency(summary.pendingBalance)}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="text-center text-slate-500 text-[10px] pt-2 sm:hidden print:hidden">
          • Swipe horizontally to view full transaction ledger •
        </div>
        <div className="overflow-x-auto touch-scroll mt-2">
          <table className="w-full border-collapse text-[11px] min-w-[700px] print:min-w-0">
            <thead>
              <tr className="border-b-2 border-black bg-slate-100 font-bold uppercase">
                <th className="p-2 border-r border-black text-left">Inward No / Date</th>
                <th className="p-2 border-r border-black text-left">Lorry / Transport</th>
                <th className="p-2 border-r border-black text-left">Material</th>
                <th className="p-2 border-r border-black text-center">Net Qty</th>
                <th className="p-2 border-r border-black text-right">Rate (₹)</th>
                <th className="p-2 border-r border-black text-right">Freight</th>
                <th className="p-2 border-r border-black text-right">Total (₹)</th>
                <th className="p-2 border-r border-black text-center">Payment</th>
                <th className="p-2 text-right print:hidden">Action</th>
              </tr>
            </thead>
          <tbody className="divide-y divide-slate-300">
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-slate-500">
                  No inward lorry entries recorded for this vendor yet.
                </td>
              </tr>
            ) : (
              purchases.map((p: any) => (
                <tr key={p._id} className="hover:bg-slate-50">
                  <td className="p-2 border-r border-black">
                    <div className="font-bold text-black">{p.inwardNo}</div>
                    <div className="text-[10px] text-slate-600">{formatDate(p.date)}</div>
                  </td>

                  <td className="p-2 border-r border-black">
                    <div className="font-mono font-black text-black">{p.vehicleNo}</div>
                    <div className="text-[10px] text-slate-600">{p.transportName || "Direct"}</div>
                  </td>

                  <td className="p-2 border-r border-black uppercase font-semibold">
                    {p.material}
                  </td>

                  <td className="p-2 border-r border-black text-center font-bold">
                    {p.qty?.toFixed(2)} {p.unit}
                  </td>

                  <td className="p-2 border-r border-black text-right">
                    ₹{formatCurrency(p.rate)}
                  </td>

                  <td className="p-2 border-r border-black text-right">
                    {p.lorryFreight ? `₹${formatCurrency(p.lorryFreight)}` : "—"}
                  </td>

                  <td className="p-2 border-r border-black text-right font-black">
                    ₹{formatCurrency(p.grandTotal)}
                  </td>

                  <td className="p-2 border-r border-black text-center">
                    <button
                      type="button"
                      onClick={() => router.push(`/purchases/${p._id}`)}
                      title="Open purchase to view or record payments"
                      className={`px-2.5 py-1.5 sm:py-1 rounded text-[10px] font-bold uppercase print:border-none cursor-pointer ${
                        p.paymentStatus === "PAID"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.paymentStatus === "PARTIAL"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {p.paymentStatus || "UNPAID"}
                    </button>
                  </td>

                  <td className="p-2 text-right print:hidden space-x-1">
                    <Link
                      href={`/purchases/${p._id}`}
                      className="p-2 hover:text-amber-600 inline-block"
                      title="View Slip"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href={`/purchases/${p._id}/print`}
                      className="p-2 hover:text-emerald-600 inline-block"
                      title="Print Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-black bg-slate-100">
              <td colSpan={3} className="p-2 border-r border-black text-right uppercase">
                Statement Totals:
              </td>
              <td className="p-2 border-r border-black text-center">
                {purchases.reduce((acc: number, p: any) => acc + (p.qty || 0), 0).toFixed(2)} Tons
              </td>
              <td colSpan={2} className="p-2 border-r border-black"></td>
              <td className="p-2 border-r border-black text-right text-sm">
                ₹{formatCurrency(summary.totalAmount)}
              </td>
              <td colSpan={2} className="p-2"></td>
            </tr>
          </tfoot>
        </table>
        </div>

        {/* Footer Signatures */}
        <div className="grid grid-cols-2 pt-12 text-center text-xs">
          <div>
            <div className="border-t border-dotted border-black w-48 mx-auto pt-1 font-bold">
              Vendor / Supplier Signature
            </div>
          </div>
          <div>
            <div className="border-t border-dotted border-black w-48 mx-auto pt-1 font-bold">
              Authorized Quarry Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
