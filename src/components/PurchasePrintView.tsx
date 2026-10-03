"use client";

import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface PurchaseData {
  _id?: string;
  inwardNo: string;
  date: string;
  time?: string;
  vendorId?: string;
  vendorName: string;
  vendorMobile?: string;
  vendorGstin?: string;
  vendorAddress?: string;
  vendorChallanNo?: string;
  ewayBillNo?: string;
  vehicleNo: string;
  transportName?: string;
  driverName?: string;
  driverMobile?: string;
  unloadingPoint?: string;
  material: string;
  hsnSac?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  qty: number;
  unit: string;
  rate: number;
  materialAmount: number;
  lorryFreight?: number;
  freightPaidBy?: string;
  loadingCharges?: number;
  taxRate?: string;
  taxAmount?: number;
  otherCharges?: number;
  grandTotal: number;
  amountInWords?: string;
  paymentStatus?: "UNPAID" | "PAID" | "PARTIAL";
  paidAmount?: number;
  paymentMode?: string;
  paymentRef?: string;
  paymentDate?: string;
  notes?: string;
  createdAt?: string | Date;
}

export default function PurchasePrintView({
  purchase,
  companyName = "QUARRY OPERATIONS & MINES",
  companyGstin = "",
  companyAddress = "",
  companyMobile = "",
}: {
  purchase: PurchaseData;
  companyName?: string;
  companyGstin?: string;
  companyAddress?: string;
  companyMobile?: string;
}) {
  return (
    <div className="paper bg-white text-black p-4 font-sans text-xs max-w-[210mm] mx-auto print:max-w-none print:p-0 print:m-0 min-w-[650px] print:min-w-0">
      <div className="border-2 border-black">
        {/* Header Title */}
        <div className="border-b-2 border-black p-3 text-center bg-slate-50 relative">
          <div className="text-xl font-black uppercase tracking-wider">{companyName}</div>
          {companyAddress && <div className="text-xs text-slate-700">{companyAddress}</div>}
          <div className="text-[11px] text-slate-600 flex justify-center gap-4 mt-0.5">
            {companyGstin && <span><strong>GSTIN:</strong> {companyGstin}</span>}
            {companyMobile && <span><strong>Ph:</strong> {companyMobile}</span>}
          </div>
          <div className="mt-2 inline-block px-4 py-0.5 bg-black text-white font-extrabold text-xs uppercase tracking-widest rounded-sm">
            INWARD PURCHASE & WEIGHBRIDGE SLIP
          </div>
          <div className="absolute right-3 top-3 text-[10px] uppercase font-bold text-slate-500">
            Gate Inward Pass
          </div>
        </div>

        {/* Voucher & Date Grid */}
        <div className="grid grid-cols-2 border-b border-black text-[11px]">
          <div className="border-r border-black p-2 space-y-1">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Inward Slip No.</span>
              <span className="font-black text-black">: {purchase.inwardNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Inward Date</span>
              <span>: {formatDate(purchase.date)} {purchase.time ? `(${purchase.time})` : ""}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Vendor DC / Bill No.</span>
              <span className="font-semibold">: {purchase.vendorChallanNo || "N/A"}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">E-Way Bill No.</span>
              <span>: {purchase.ewayBillNo || "N/A"}</span>
            </div>
          </div>

          <div className="p-2 space-y-1">
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Lorry / Vehicle No.</span>
              <span className="font-black text-black text-sm">: {purchase.vehicleNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Transport Agency</span>
              <span>: {purchase.transportName || "Direct / Supplier Transport"}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Driver Name</span>
              <span>: {purchase.driverName || "N/A"} {purchase.driverMobile ? `(${purchase.driverMobile})` : ""}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-bold text-slate-700">Unloading Pit/Point</span>
              <span className="font-semibold">: {purchase.unloadingPoint || "Main Hopper / Stockyard"}</span>
            </div>
          </div>
        </div>

        {/* Vendor Information Box */}
        <div className="p-2.5 border-b border-black bg-slate-50/50">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor / Quarry Supplier Details:</div>
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mt-1">
            <div>
              <div className="text-sm font-black uppercase text-black">{purchase.vendorName}</div>
              {purchase.vendorAddress && <div className="text-[11px] text-slate-700">{purchase.vendorAddress}</div>}
            </div>
            <div className="text-[11px] text-left sm:text-right mt-1 sm:mt-0 space-y-0.5">
              {purchase.vendorMobile && <div><strong>Mobile:</strong> {purchase.vendorMobile}</div>}
              {purchase.vendorGstin && <div><strong>GSTIN:</strong> {purchase.vendorGstin}</div>}
            </div>
          </div>
        </div>

        {/* Weighbridge Weights Breakdown (if available) */}
        {(purchase.grossWeight || purchase.tareWeight) ? (
          <div className="border-b border-black p-2 bg-amber-50/50">
            <div className="text-[10px] font-bold uppercase text-amber-900 mb-1">Weighbridge Scale Weight Verification:</div>
            <div className="grid grid-cols-3 text-center border border-slate-300 divide-x divide-slate-300 py-1 bg-white">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Gross Weight</span>
                <span className="font-bold text-xs">{purchase.grossWeight?.toFixed(2)} {purchase.unit}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Tare Weight (Empty)</span>
                <span className="font-bold text-xs">{purchase.tareWeight?.toFixed(2)} {purchase.unit}</span>
              </div>
              <div className="bg-amber-100/50">
                <span className="block text-[10px] font-bold text-amber-900 uppercase">Net Weight (Material)</span>
                <span className="font-black text-xs text-amber-950">{(purchase.netWeight || purchase.qty)?.toFixed(2)} {purchase.unit}</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Material & Financial Table */}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-black bg-slate-100 font-bold uppercase">
              <th className="p-2 border-r border-black w-10 text-center">#</th>
              <th className="p-2 border-r border-black text-left">Material / Stone Description</th>
              <th className="p-2 border-r border-black text-center w-24">Inward Qty</th>
              <th className="p-2 border-r border-black text-center w-16">Unit</th>
              <th className="p-2 border-r border-black text-right w-24">Rate (₹)</th>
              <th className="p-2 text-right w-28">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black text-center font-bold">1</td>
              <td className="p-2 border-r border-black">
                <div className="font-bold text-xs uppercase">{purchase.material}</div>
                {purchase.hsnSac && <div className="text-[10px] text-slate-500">HSN/SAC: {purchase.hsnSac}</div>}
              </td>
              <td className="p-2 border-r border-black text-center font-bold text-xs">
                {purchase.qty?.toFixed(2)}
              </td>
              <td className="p-2 border-r border-black text-center">{purchase.unit}</td>
              <td className="p-2 border-r border-black text-right font-medium">
                {formatCurrency(purchase.rate)}
              </td>
              <td className="p-2 text-right font-bold">
                {formatCurrency(purchase.materialAmount)}
              </td>
            </tr>

            {/* Extra Rows for Charges if any */}
            {purchase.lorryFreight && purchase.lorryFreight > 0 && purchase.freightPaidBy === "Paid by Us" ? (
              <tr className="border-b border-black/50 text-slate-700">
                <td className="p-1 border-r border-black text-center">2</td>
                <td className="p-1 border-r border-black pl-3" colSpan={4}>
                  Lorry Transport & Freight Charges ({purchase.transportName || "Transporter"})
                </td>
                <td className="p-1 text-right">{formatCurrency(purchase.lorryFreight)}</td>
              </tr>
            ) : null}

            {purchase.loadingCharges && purchase.loadingCharges > 0 ? (
              <tr className="border-b border-black/50 text-slate-700">
                <td className="p-1 border-r border-black text-center">3</td>
                <td className="p-1 border-r border-black pl-3" colSpan={4}>
                  Loading / Unloading Charges
                </td>
                <td className="p-1 text-right">{formatCurrency(purchase.loadingCharges)}</td>
              </tr>
            ) : null}

            {purchase.taxAmount && purchase.taxAmount > 0 ? (
              <tr className="border-b border-black/50 text-slate-700">
                <td className="p-1 border-r border-black text-center">4</td>
                <td className="p-1 border-r border-black pl-3" colSpan={4}>
                  GST / Taxes ({purchase.taxRate})
                </td>
                <td className="p-1 text-right">{formatCurrency(purchase.taxAmount)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Calculation Summary Footer */}
        <div className="grid grid-cols-12 border-b border-black text-[11px]">
          <div className="col-span-7 p-2 border-r border-black flex flex-col justify-between">
            <div>
              <div className="font-bold text-slate-700 text-[10px] uppercase">Amount in Words:</div>
              <div className="font-bold text-black italic text-xs mt-0.5">{purchase.amountInWords}</div>
            </div>
            {purchase.notes && (
              <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-1 border border-slate-200">
                <strong>Remarks / Notes:</strong> {purchase.notes}
              </div>
            )}
            <div className="mt-2 text-[10px] flex items-center gap-3">
              <span><strong>Payment Status:</strong> {purchase.paymentStatus}</span>
              {purchase.paidAmount ? <span><strong>Paid:</strong> ₹{formatCurrency(purchase.paidAmount)}</span> : null}
              {purchase.paymentMode ? <span><strong>Mode:</strong> {purchase.paymentMode}</span> : null}
            </div>
          </div>

          <div className="col-span-5 divide-y divide-black/60 font-medium">
            <div className="flex justify-between p-1.5">
              <span>Material Subtotal:</span>
              <span>₹{formatCurrency(purchase.materialAmount)}</span>
            </div>
            {purchase.lorryFreight ? (
              <div className="flex justify-between p-1.5 text-slate-700">
                <span>Lorry Freight ({purchase.freightPaidBy}):</span>
                <span>₹{formatCurrency(purchase.lorryFreight)}</span>
              </div>
            ) : null}
            {purchase.loadingCharges ? (
              <div className="flex justify-between p-1.5 text-slate-700">
                <span>Handling / Unloading:</span>
                <span>₹{formatCurrency(purchase.loadingCharges)}</span>
              </div>
            ) : null}
            {purchase.taxAmount ? (
              <div className="flex justify-between p-1.5 text-slate-700">
                <span>Tax ({purchase.taxRate}):</span>
                <span>₹{formatCurrency(purchase.taxAmount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between p-2 font-black text-sm bg-slate-100">
              <span>NET TOTAL:</span>
              <span>₹{formatCurrency(purchase.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 p-4 pt-10 text-center text-xs">
          <div>
            <div className="border-t border-dotted border-black w-48 mx-auto pt-1 font-bold">
              Lorry Driver / Transporter Signature
            </div>
            <div className="text-[10px] text-slate-500">Vehicle: {purchase.vehicleNo}</div>
          </div>
          <div>
            <div className="border-t border-dotted border-black w-48 mx-auto pt-1 font-bold">
              Authorized Weighbridge / Quarry Manager
            </div>
            <div className="text-[10px] text-slate-500">Verified & Inward Recorded</div>
          </div>
        </div>
      </div>
    </div>
  );
}
