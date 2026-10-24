"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";

export interface BillData {
  _id?: string;
  invoiceNo: string;
  date: string;
  placeOfSupply: string;
  reverseCharge: string;
  grRrNo: string;
  transport: string;
  vehicleNo: string;
  station: string;
  companyName: string;
  companyGstin: string;
  companyAddress?: string;
  companyMobile?: string;
  loadingCharges?: number;
  lorryFreight?: number;
  documentTitle: string;
  copyLabel: string;
  billedTo: {
    name: string;
    mobile: string;
    gstin: string;
    address: string;
  };
  shippedTo: {
    name: string;
    mobile: string;
    gstin: string;
    address: string;
  };
  items: Array<{
    sn: number;
    description: string;
    hsnSac: string;
    qty: number;
    unit: string;
    price: number;
    amount: number;
    /** Purchase (inward load) this line is sold from */
    purchaseId?: string;
    inwardNo?: string;
  }>;
  totalQty: number;
  totalQtyUnit: string;
  taxRate: string;
  taxableAmount: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankBranch: string;
  };
  termsAndConditions: string[];
  authorisedSignatoryText: string;
  paymentStatus?: "UNPAID" | "PAID" | "PARTIAL";
  paidAmount?: number;
}

export default function BillPrintView({ bill }: { bill: BillData }) {
  // Ensure table has at least 8 row slots for clean receipt visual
  const minRows = 8;
  const items = bill.items || [];
  const emptyRowsCount = Math.max(0, minRows - items.length);

  // Material value plus the extra charges that make up the grand total
  const discount = bill.discountAmount || 0;
  const taxableValue = Math.round(((bill.taxableAmount || 0) - discount) * 100) / 100;
  const chargeRows: [string, number][] = [["Material Amount", bill.taxableAmount || 0]];
  if (discount) {
    chargeRows.push([`Less: Discount${bill.discountType === "PERCENT" ? ` (${bill.discountValue}%)` : ""}`, -discount]);
    chargeRows.push(["Taxable Value", taxableValue]);
  }
  if (bill.loadingCharges) chargeRows.push(["Loading Charges", bill.loadingCharges]);
  if (bill.lorryFreight) chargeRows.push(["Transport Charges (Lorry Freight)", bill.lorryFreight]);
  if (bill.totalTax) chargeRows.push([`GST ${bill.taxRate || ""}`.trim(), bill.totalTax]);

  // Payment line. Before saving, "Full payment" has no receipt yet, so it counts as the whole total.
  const status = bill.paymentStatus || "UNPAID";
  const grand = bill.grandTotal || 0;
  const paid = status === "PAID" ? Math.max(bill.paidAmount || 0, grand) : status === "PARTIAL" ? bill.paidAmount || 0 : 0;
  const payment = {
    label: status === "PAID" ? "Fully paid" : status === "PARTIAL" ? "Advance paid" : "Not paid",
    paid,
    due: Math.max(0, Math.round((grand - paid) * 100) / 100),
  };

  return (
    <div className="paper bg-white text-black p-4 font-sans text-xs max-w-[210mm] mx-auto print:max-w-none print:p-0 print:m-0 min-w-[650px] print:min-w-0">
      {/* Outer Invoice Container Box */}
      <div className="border border-black">
        
        {/* Top Header */}
        <div className="border-b border-black p-2 flex justify-between items-center relative">
          <div className="text-left font-semibold">
            <span>GSTIN : </span>
            <span>{bill.companyGstin}</span>
          </div>
          <div className="text-center font-bold px-2">
            {bill.companyName ? (
              <div className="text-lg font-extrabold uppercase tracking-wide">{bill.companyName}</div>
            ) : (
              // Shown on screen only, never printed
              <div className="print:hidden text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-1">
                Company name is not set — add it in Settings → Company Profile
              </div>
            )}
            {bill.companyAddress && <div className="text-[11px] font-medium">{bill.companyAddress}</div>}
            {bill.companyMobile && <div className="text-[11px] font-medium">Mobile: {bill.companyMobile}</div>}
            <div className="text-base uppercase underline tracking-wider mt-0.5">{bill.documentTitle || "BILL OF SUPPLY"}</div>
          </div>
          <div className="text-right italic font-medium text-[11px]">
            {bill.copyLabel || "Original Copy"}
          </div>
        </div>

        {/* Details Grid (Invoice No, Dates, Transport) */}
        <div className="grid grid-cols-2 border-b border-black text-[11px]">
          {/* Left Column */}
          <div className="border-r border-black p-1.5 space-y-0.5">
            <div className="flex">
              <span className="w-32 font-semibold">Invoice No.</span>
              <span className="font-bold">: {bill.invoiceNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Dated</span>
              <span>: {bill.date}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Place of Supply</span>
              <span>: {bill.placeOfSupply}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Reverse Charge</span>
              <span>: {bill.reverseCharge}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="p-1.5 space-y-0.5">
            <div className="flex">
              <span className="w-32 font-semibold">GR/RR No.</span>
              <span>: {bill.grRrNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Transport</span>
              <span>: {bill.transport}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Vehicle No.</span>
              <span className="font-bold">: {bill.vehicleNo}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-semibold">Station</span>
              <span>: {bill.station}</span>
            </div>
          </div>
        </div>

        {/* Billed To & Shipped To */}
        <div className="grid grid-cols-2 border-b border-black text-[11px]">
          {/* Billed to */}
          <div className="border-r border-black p-1.5 space-y-1">
            <div className="font-bold uppercase tracking-wide">Billed to :</div>
            <div className="font-extrabold text-sm pl-2 uppercase">{bill.billedTo?.name}</div>
            {bill.billedTo?.address && <div className="pl-2">{bill.billedTo.address}</div>}
            <div className="pt-2 space-y-0.5 text-[10px]">
              <div>Party Mobile No : {bill.billedTo?.mobile}</div>
              <div>GSTIN / UIN : {bill.billedTo?.gstin}</div>
            </div>
          </div>

          {/* Shipped to */}
          <div className="p-1.5 space-y-1">
            <div className="font-bold uppercase tracking-wide">Shipped to :</div>
            <div className="font-extrabold text-sm pl-2 uppercase">{bill.shippedTo?.name}</div>
            {bill.shippedTo?.address && <div className="pl-2">{bill.shippedTo.address}</div>}
            <div className="pt-2 space-y-0.5 text-[10px]">
              <div>Party Mobile No : {bill.shippedTo?.mobile}</div>
              <div>GSTIN / UIN : {bill.shippedTo?.gstin}</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border-b border-black">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-black bg-slate-50 text-[10px] uppercase font-bold text-center">
                <th className="border-r border-black p-1 w-10">S.N.</th>
                <th className="border-r border-black p-1 text-left">Description of Goods</th>
                <th className="border-r border-black p-1 w-20">HSN/SAC Code</th>
                <th className="border-r border-black p-1 w-16 text-right">Qty.</th>
                <th className="border-r border-black p-1 w-16 text-center">Unit</th>
                <th className="border-r border-black p-1 w-24 text-right">Price</th>
                <th className="p-1 w-28 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="border-r border-black p-1 text-center font-medium">{item.sn || idx + 1}.</td>
                  <td className="border-r border-black p-1 text-left font-bold uppercase">{item.description}</td>
                  <td className="border-r border-black p-1 text-center">{item.hsnSac}</td>
                  <td className="border-r border-black p-1 text-right font-medium">{item.qty ? Number(item.qty).toFixed(2) : ""}</td>
                  <td className="border-r border-black p-1 text-center font-medium">{item.unit}</td>
                  <td className="border-r border-black p-1 text-right">{item.price ? formatCurrency(item.price) : ""}</td>
                  <td className="p-1 text-right font-bold">{item.amount ? formatCurrency(item.amount) : ""}</td>
                </tr>
              ))}

              {/* Filler Empty Rows for A4 spacing */}
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

        {/* Charges added to the material value (only those used) */}
        {chargeRows.length > 1 && (
          <div className="border-b border-black text-[11px]">
            {chargeRows.map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-slate-200 last:border-b-0">
                <div className="p-1 pl-2 flex-1 text-right font-semibold border-r border-black">{label}</div>
                <div className="p-1 w-28 text-right font-semibold">{value < 0 ? `− ${formatCurrency(-value)}` : formatCurrency(value)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Grand Total Bar */}
        <div className="border-b border-black flex items-center justify-between font-bold text-[11px] bg-slate-50">
          <div className="p-1.5 text-right flex-1 border-r border-black">Grand Total</div>
          <div className="p-1.5 w-32 text-center border-r border-black">
            {bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : ""}
          </div>
          <div className="p-1.5 w-12 text-center border-r border-black">₹</div>
          <div className="p-1.5 w-28 text-right font-extrabold text-sm">{formatCurrency(bill.grandTotal)}</div>
        </div>

        {/* Tax Table Summary */}
        <div className="border-b border-black text-[10px]">
          <div className="grid grid-cols-4 border-b border-slate-300 font-semibold bg-slate-50 text-center p-1">
            <span>Tax Rate</span>
            <span>Taxable Amt.</span>
            <span>IGST Amt.</span>
            <span>Total Tax</span>
          </div>
          <div className="grid grid-cols-4 text-center p-1 border-b border-black">
            <span>{bill.taxRate || "Exempt"}</span>
            <span>{formatCurrency(taxableValue)}</span>
            <span>--</span>
            <span>{formatCurrency(bill.totalTax)}</span>
          </div>
        </div>

        {/* Amount in Words Line */}
        <div className="border-b border-black p-1.5 font-extrabold text-[11px] bg-slate-50">
          {bill.amountInWords?.startsWith("Rupees") ? bill.amountInWords : `Rupees ${bill.amountInWords}`}
        </div>

        {/* Payment status */}
        <div className="border-b border-black p-1.5 text-[11px] flex flex-wrap justify-between gap-x-4 gap-y-0.5">
          <span>
            <span className="font-bold">Payment : </span>
            <span className="font-extrabold uppercase">{payment.label}</span>
          </span>
          {payment.paid > 0 && (
            <span>
              Received : <span className="font-bold">₹{formatCurrency(payment.paid)}</span>
            </span>
          )}
          <span>
            Balance Due : <span className="font-extrabold">₹{formatCurrency(payment.due)}</span>
          </span>
        </div>

        {/* Bank Details & Terms / Signature Footer */}
        <div className="grid grid-cols-12 text-[10px]">
          {/* Left Block (Bank Details + Terms + Receiver Signature) - 7 cols */}
          <div className="col-span-7 border-r border-black p-2 flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold underline uppercase mb-0.5">Bank Details :</div>
              <div className="font-medium uppercase">
                {bill.bankDetails?.accountName && (
                  <span>{bill.bankDetails.accountName}, </span>
                )}
                {bill.bankDetails?.accountNumber && (
                  <span>C/A NO {bill.bankDetails.accountNumber}, </span>
                )}
                {bill.bankDetails?.ifscCode && (
                  <span>IFSC CODE {bill.bankDetails.ifscCode}, </span>
                )}
                {bill.bankDetails?.bankBranch && (
                  <span>{bill.bankDetails.bankBranch}</span>
                )}
              </div>
            </div>

            {/* Terms */}
            {bill.termsAndConditions && bill.termsAndConditions.length > 0 && (
              <div className="text-[9px] text-slate-800 space-y-0.5 pt-1">
                {bill.termsAndConditions.map((term, i) => (
                  <div key={i}>{term}</div>
                ))}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between font-semibold">
              <span>Receiver's Signature :</span>
            </div>
          </div>

          {/* Right Block (Authorised Signatory) - 5 cols */}
          <div className="col-span-5 p-2 flex flex-col justify-between items-center text-center">
            <div className="font-bold text-xs self-end">
              {bill.authorisedSignatoryText || (bill.companyName ? `for ${bill.companyName}` : "")}
            </div>
            
            <div className="py-6 italic text-slate-400 text-[9px]">
              ( Authorised Stamp / Signature )
            </div>

            <div className="font-bold text-xs border-t border-black pt-1 w-3/4">
              Authorised Signatory
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
