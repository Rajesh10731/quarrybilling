"use client";

import React from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface QuotationItem {
  sn?: number;
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  price: number;
  amount?: number;
}

export interface QuotationData {
  _id?: string;
  quotationNo: string;
  date: string;
  validUntil: string;
  companyName?: string;
  companyGstin?: string;
  companyAddress?: string;
  companyMobile?: string;
  authorisedSignatoryText?: string;
  customer: { name: string; mobile: string; gstin: string; address: string };
  deliveryPlace: string;
  items: QuotationItem[];
  totalQty?: number;
  loadingCharges: number;
  lorryFreight: number;
  taxRate: string;
  taxableAmount?: number;
  discountType?: "NONE" | "PERCENT" | "AMOUNT" | string;
  discountValue?: number;
  discountAmount?: number;
  totalTax?: number;
  grandTotal?: number;
  amountInWords?: string;
  notes: string;
  termsAndConditions: string[];
  status?: "OPEN" | "ACCEPTED" | "REJECTED" | "CONVERTED";
  displayStatus?: "OPEN" | "ACCEPTED" | "REJECTED" | "CONVERTED" | "EXPIRED";
  convertedBillId?: string;
  convertedInvoiceNo?: string;
}

export default function QuotationPrintView({ quotation }: { quotation: QuotationData }) {
  const items = quotation.items || [];
  const emptyRowsCount = Math.max(0, 6 - items.length);

  return (
    <div className="paper bg-white text-black p-4 font-sans text-xs max-w-[210mm] mx-auto print:max-w-none print:p-0 print:m-0 min-w-[650px] print:min-w-0">
      <div className="border border-black">
        {/* Letterhead */}
        <div className="border-b border-black p-3 text-center space-y-0.5">
          {quotation.companyName && (
            <div className="text-base font-extrabold uppercase tracking-wide">{quotation.companyName}</div>
          )}
          {quotation.companyAddress && <div className="text-[11px]">{quotation.companyAddress}</div>}
          <div className="text-[10px] space-x-3">
            {quotation.companyMobile && <span>Mobile: {quotation.companyMobile}</span>}
            {quotation.companyGstin && <span>GSTIN: {quotation.companyGstin}</span>}
          </div>
          <div className="pt-1 text-base font-bold uppercase underline tracking-widest">Quotation</div>
        </div>

        {/* Quotation details + customer */}
        <div className="grid grid-cols-2 border-b border-black text-[11px]">
          <div className="border-r border-black p-2 space-y-1">
            <div className="font-bold uppercase tracking-wide">To :</div>
            <div className="font-extrabold text-sm pl-2 uppercase">{quotation.customer?.name}</div>
            {quotation.customer?.address && <div className="pl-2">{quotation.customer.address}</div>}
            <div className="pt-1 space-y-0.5 text-[10px] pl-2">
              {quotation.customer?.mobile && <div>Mobile : {quotation.customer.mobile}</div>}
              {quotation.customer?.gstin && <div>GSTIN / UIN : {quotation.customer.gstin}</div>}
            </div>
          </div>
          <div className="p-2 space-y-0.5">
            <div className="flex">
              <span className="w-32 font-semibold">Quotation No.</span>
              <span className="font-bold">: {quotation.quotationNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Date</span>
              <span>: {formatDate(quotation.date)}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Valid Until</span>
              <span className="font-bold">: {formatDate(quotation.validUntil)}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Delivery Place</span>
              <span>: {quotation.deliveryPlace || "--"}</span>
            </div>
          </div>
        </div>

        <div className="border-b border-black px-2 py-1.5 text-[11px]">
          Dear Sir / Madam, we are pleased to quote our best rates for the following materials:
        </div>

        {/* Items */}
        <div className="border-b border-black">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-black bg-slate-50 text-[10px] uppercase font-bold text-center">
                <th className="border-r border-black p-1 w-10">S.N.</th>
                <th className="border-r border-black p-1 text-left">Description of Goods</th>
                <th className="border-r border-black p-1 w-20">HSN/SAC</th>
                <th className="border-r border-black p-1 w-16 text-right">Qty.</th>
                <th className="border-r border-black p-1 w-16">Unit</th>
                <th className="border-r border-black p-1 w-24 text-right">Rate</th>
                <th className="p-1 w-28 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="border-r border-black p-1 text-center">{item.sn || idx + 1}.</td>
                  <td className="border-r border-black p-1 font-bold uppercase">{item.description}</td>
                  <td className="border-r border-black p-1 text-center">{item.hsnSac}</td>
                  <td className="border-r border-black p-1 text-right">{Number(item.qty || 0).toFixed(2)}</td>
                  <td className="border-r border-black p-1 text-center">{item.unit}</td>
                  <td className="border-r border-black p-1 text-right">{formatCurrency(item.price)}</td>
                  <td className="p-1 text-right font-bold">{formatCurrency(item.amount ?? item.qty * item.price)}</td>
                </tr>
              ))}
              {Array.from({ length: emptyRowsCount }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="h-6">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-12 border-b border-black text-[11px]">
          <div className="col-span-7 border-r border-black p-2 space-y-1">
            {quotation.notes && (
              <div>
                <div className="font-bold underline uppercase text-[10px]">Notes :</div>
                <div className="whitespace-pre-line">{quotation.notes}</div>
              </div>
            )}
          </div>
          <div className="col-span-5">
            {[
              ["Material Value", quotation.taxableAmount],
              ...(quotation.discountAmount
                ? [
                    [`Less: Discount${quotation.discountType === "PERCENT" ? ` (${quotation.discountValue}%)` : ""}`, -quotation.discountAmount],
                    ["Taxable Value", (quotation.taxableAmount || 0) - quotation.discountAmount],
                  ]
                : []),
              ...(quotation.taxRate && quotation.taxRate !== "Exempt" ? [[`GST @ ${quotation.taxRate}`, quotation.totalTax]] : []),
              ...(quotation.loadingCharges ? [["Loading Charges", quotation.loadingCharges]] : []),
              ...(quotation.lorryFreight ? [["Lorry Freight", quotation.lorryFreight]] : []),
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between px-2 py-1 border-b border-slate-300">
                <span>{label}</span>
                <span>{Number(value) < 0 ? `− ₹${formatCurrency(-Number(value))}` : `₹${formatCurrency(Number(value) || 0)}`}</span>
              </div>
            ))}
            <div className="flex justify-between px-2 py-1.5 font-extrabold text-sm bg-slate-50">
              <span>Total</span>
              <span>₹{formatCurrency(quotation.grandTotal || 0)}</span>
            </div>
          </div>
        </div>

        <div className="border-b border-black p-1.5 font-extrabold text-[11px] bg-slate-50">
          {quotation.amountInWords}
        </div>

        {/* Terms & signature */}
        <div className="grid grid-cols-12 text-[10px]">
          <div className="col-span-7 border-r border-black p-2 space-y-1">
            <div className="font-bold underline uppercase">Terms &amp; Conditions :</div>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>This quotation is valid until {formatDate(quotation.validUntil)}.</li>
              {(quotation.termsAndConditions || []).map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ol>
          </div>
          <div className="col-span-5 p-2 flex flex-col justify-between items-center text-center min-h-[90px]">
            <div className="font-bold text-xs self-end">
              {quotation.authorisedSignatoryText || (quotation.companyName ? `for ${quotation.companyName}` : "")}
            </div>
            <div className="font-bold text-xs border-t border-black pt-1 w-3/4">Authorised Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
