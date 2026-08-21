"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Printer, ArrowLeft, Copy, UserCheck } from "lucide-react";
import { numberToWords, formatCurrency } from "@/lib/utils";
import { BillData } from "./BillPrintView";

const GOODS_SUGGESTIONS = [
  "20MM JALLY",
  "CONCRETE SAND",
  "40MM JALLY",
  "10MM JALLY",
  "DUST",
  "M SAND",
  "P SAND",
  "GABION",
];

const UNITS = ["Tonne", "CFT", "Trips", "Kg", "Nos", "Load"];

interface BillFormProps {
  initialBill?: Partial<BillData>;
  isEditing?: boolean;
}

export default function BillForm({ initialBill, isEditing = false }: BillFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sameAsBilledTo, setSameAsBilledTo] = useState(false);

  // Stored customers list for auto-complete suggestion
  const [customersList, setCustomersList] = useState<any[]>([]);

  // Form state with extra fields (deliveryPlace, loadingCharges, lorryFreight)
  const [formData, setFormData] = useState<BillData & { deliveryPlace?: string; loadingCharges?: number; lorryFreight?: number }>({
    invoiceNo: initialBill?.invoiceNo || `1/${new Date().getFullYear()}`,
    date: initialBill?.date || new Date().toISOString().split("T")[0],
    placeOfSupply: initialBill?.placeOfSupply || "",
    reverseCharge: initialBill?.reverseCharge || "N",
    grRrNo: initialBill?.grRrNo || "",
    transport: initialBill?.transport || "",
    vehicleNo: initialBill?.vehicleNo || "",
    station: initialBill?.station || "",
    deliveryPlace: (initialBill as any)?.deliveryPlace || "",
    loadingCharges: (initialBill as any)?.loadingCharges || 0,
    lorryFreight: (initialBill as any)?.lorryFreight || 0,
    companyName: initialBill?.companyName || "",
    companyGstin: initialBill?.companyGstin || "",
    documentTitle: initialBill?.documentTitle || "BILL OF SUPPLY",
    copyLabel: initialBill?.copyLabel || "Original Copy",
    billedTo: {
      name: initialBill?.billedTo?.name || "",
      mobile: initialBill?.billedTo?.mobile || "",
      gstin: initialBill?.billedTo?.gstin || "",
      address: initialBill?.billedTo?.address || "",
    },
    shippedTo: {
      name: initialBill?.shippedTo?.name || "",
      mobile: initialBill?.shippedTo?.mobile || "",
      gstin: initialBill?.shippedTo?.gstin || "",
      address: initialBill?.shippedTo?.address || "",
    },
    items: initialBill?.items?.length
      ? initialBill.items
      : [
          { sn: 1, description: "", hsnSac: "", qty: 0, unit: "Tonne", price: 0, amount: 0 },
        ],
    totalQty: initialBill?.totalQty || 0,
    totalQtyUnit: initialBill?.totalQtyUnit || "Tonne",
    taxRate: initialBill?.taxRate || "Exempt",
    taxableAmount: initialBill?.taxableAmount || 0,
    igstAmount: initialBill?.igstAmount || 0,
    cgstAmount: initialBill?.cgstAmount || 0,
    sgstAmount: initialBill?.sgstAmount || 0,
    totalTax: initialBill?.totalTax || 0,
    grandTotal: initialBill?.grandTotal || 0,
    amountInWords: initialBill?.amountInWords || "Rupees Zero Only",
    bankDetails: {
      accountName: initialBill?.bankDetails?.accountName || "",
      accountNumber: initialBill?.bankDetails?.accountNumber || "",
      ifscCode: initialBill?.bankDetails?.ifscCode || "",
      bankBranch: initialBill?.bankDetails?.bankBranch || "",
    },
    termsAndConditions: initialBill?.termsAndConditions || [],
    authorisedSignatoryText: initialBill?.authorisedSignatoryText || "",
    paymentStatus: (initialBill as any)?.paymentStatus || "UNPAID",
    paidAmount: (initialBill as any)?.paidAmount || 0,
  });

  // Fetch Customers for auto-complete dropdown
  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setCustomersList(data);
      })
      .catch((err) => console.error(err));
  }, []);

  // Fetch Saved Settings if creating a new bill
  useEffect(() => {
    if (!isEditing && !initialBill) {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((settings) => {
          if (settings) {
            setFormData((prev) => ({
              ...prev,
              companyName: settings.companyName || "",
              companyGstin: settings.companyGstin || "",
              documentTitle: settings.documentTitle || "BILL OF SUPPLY",
              copyLabel: settings.copyLabel || "Original Copy",
              bankDetails: {
                accountName: settings.bankAccountName || "",
                accountNumber: settings.bankAccountNumber || "",
                ifscCode: settings.bankIfsc || "",
                bankBranch: settings.bankBranch || "",
              },
              termsAndConditions: settings.termsAndConditions || [],
              authorisedSignatoryText: settings.authorisedSignatoryText || "",
            }));
          }
        })
        .catch((err) => console.error(err));
    }
  }, [isEditing, initialBill]);

  // Recalculate totals whenever items, loading charges, or lorry freight changes
  useEffect(() => {
    let sumQty = 0;
    let sumTaxable = 0;
    const updatedItems = formData.items.map((item, idx) => {
      const q = Number(item.qty) || 0;
      const p = Number(item.price) || 0;
      const amt = Math.round(q * p * 100) / 100;
      sumQty += q;
      sumTaxable += amt;
      return { ...item, sn: idx + 1, amount: amt };
    });

    let taxAmount = 0;
    if (formData.taxRate !== "Exempt" && formData.taxRate !== "0%") {
      const rateNum = parseFloat(formData.taxRate) || 0;
      taxAmount = Math.round(((sumTaxable * rateNum) / 100) * 100) / 100;
    }

    const loading = Number(formData.loadingCharges) || 0;
    const freight = Number(formData.lorryFreight) || 0;
    const gTotal = Math.round((sumTaxable + taxAmount + loading + freight) * 100) / 100;
    const words = numberToWords(gTotal);

    setFormData((prev) => ({
      ...prev,
      items: updatedItems,
      totalQty: Math.round(sumQty * 100) / 100,
      taxableAmount: Math.round(sumTaxable * 100) / 100,
      totalTax: taxAmount,
      grandTotal: gTotal,
      amountInWords: words,
    }));
  }, [
    JSON.stringify(formData.items.map((i) => ({ q: i.qty, p: i.price }))),
    formData.taxRate,
    formData.loadingCharges,
    formData.lorryFreight,
  ]);

  // Select customer from suggestion dropdown
  const handleSelectCustomer = (cust: any) => {
    setFormData((prev) => ({
      ...prev,
      billedTo: {
        name: cust.name || "",
        mobile: cust.mobile || "",
        gstin: cust.gstin || "",
        address: cust.address || "",
      },
      shippedTo: sameAsBilledTo
        ? {
            name: cust.name || "",
            mobile: cust.mobile || "",
            gstin: cust.gstin || "",
            address: cust.address || "",
          }
        : prev.shippedTo,
      deliveryPlace: cust.deliveryPlace || prev.deliveryPlace,
    }));
  };

  // Handle Item Row changes
  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          sn: prev.items.length + 1,
          description: "",
          hsnSac: "",
          qty: 0,
          unit: prev.totalQtyUnit || "Tonne",
          price: 0,
          amount: 0,
        },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, items: newItems }));
  };

  const handleCopyBilledToShipped = () => {
    setSameAsBilledTo(!sameAsBilledTo);
    if (!sameAsBilledTo) {
      setFormData((prev) => ({
        ...prev,
        shippedTo: { ...prev.billedTo },
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent, shouldPrintAfter = false) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Auto-save customer to Customer Database
      if (formData.billedTo?.name) {
        await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.billedTo.name,
            mobile: formData.billedTo.mobile,
            gstin: formData.billedTo.gstin,
            address: formData.billedTo.address,
            deliveryPlace: formData.deliveryPlace || "",
          }),
        });
      }

      // 2. Save Bill
      const url = isEditing && initialBill?._id ? `/api/bills/${initialBill._id}` : "/api/bills";
      const method = isEditing && initialBill?._id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save bill");
      }

      if (shouldPrintAfter) {
        router.push(`/bills/${data._id}/print`);
      } else {
        router.push(`/bills/${data._id}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 text-slate-100">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center text-sm text-slate-400 hover:text-white mb-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            {isEditing ? "Edit Quarry Bill" : "Create New Quarry Bill"}
          </h1>
          <p className="text-sm text-slate-400">Fill in bill details. Customer details are automatically stored in database.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => handleSubmit(e, false)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-all shadow-md disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{loading ? "Saving..." : "Save Bill"}</span>
          </button>

          <button
            type="button"
            onClick={(e) => handleSubmit(e, true)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        {/* 1. Header & Invoice Metadata */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>1. Bill Header & Transport Info</span>
            <span className="text-xs font-normal text-slate-400">Invoice #, Dates, Lorry & Delivery</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="Company / Quarry Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Supplier GSTIN</label>
              <input
                type="text"
                value={formData.companyGstin}
                onChange={(e) => setFormData({ ...formData, companyGstin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="Supplier GSTIN"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Document Title</label>
              <input
                type="text"
                value={formData.documentTitle}
                onChange={(e) => setFormData({ ...formData, documentTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="BILL OF SUPPLY"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Copy Label</label>
              <input
                type="text"
                value={formData.copyLabel}
                onChange={(e) => setFormData({ ...formData, copyLabel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="Original Copy"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Invoice No. *</label>
              <input
                type="text"
                required
                value={formData.invoiceNo}
                onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
                placeholder="e.g. 11439"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Date *</label>
              <input
                type="text"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="03-06-2026"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle No. (Lorry #)</label>
              <input
                type="text"
                value={formData.vehicleNo}
                onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                placeholder="e.g. TN74BK6973"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Place / Site</label>
              <input
                type="text"
                value={formData.deliveryPlace}
                onChange={(e) => setFormData({ ...formData, deliveryPlace: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="e.g. PARUTHIVILAI"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Place of Supply</label>
              <input
                type="text"
                value={formData.placeOfSupply}
                onChange={(e) => setFormData({ ...formData, placeOfSupply: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="Tamilnadu (33)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Reverse Charge</label>
              <select
                value={formData.reverseCharge}
                onChange={(e) => setFormData({ ...formData, reverseCharge: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="N">N (No)</option>
                <option value="Y">Y (Yes)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">GR / RR No.</label>
              <input
                type="text"
                value={formData.grRrNo}
                onChange={(e) => setFormData({ ...formData, grRrNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Transport Name</label>
              <input
                type="text"
                value={formData.transport}
                onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Payment Status</label>
              <select
                value={formData.paymentStatus || "UNPAID"}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                className={`w-full border rounded-lg px-3 py-2 text-sm font-bold focus:outline-none ${
                  formData.paymentStatus === "PAID"
                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                    : formData.paymentStatus === "PARTIAL"
                    ? "bg-amber-950 text-amber-300 border-amber-700"
                    : "bg-red-950 text-red-300 border-red-800"
                }`}
              >
                <option value="UNPAID">🔴 UNPAID (Default)</option>
                <option value="PAID">🟢 PAID</option>
                <option value="PARTIAL">🟡 PARTIAL</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Customer Parties (Billed To & Shipped To) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                <span>2. Customer Party Details</span>
              </h2>
              <p className="text-xs text-slate-400">Saving this bill will automatically store customer in database</p>
            </div>
            <button
              type="button"
              onClick={handleCopyBilledToShipped}
              className="flex items-center space-x-1.5 text-xs text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/30 transition-all mt-2 sm:mt-0"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{sameAsBilledTo ? "Unlink Shipped To" : "Same as Billed To"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Billed To */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Billed To (Customer)</h3>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Party / Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.billedTo.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billedTo: { ...formData.billedTo, name: e.target.value },
                      shippedTo: sameAsBilledTo ? { ...formData.shippedTo, name: e.target.value } : formData.shippedTo,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-amber-500 focus:outline-none uppercase"
                  placeholder="e.g. ROBERT MOBILE GARDEN"
                />

                {/* Stored Customer Suggestions */}
                {customersList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    <span className="text-[10px] text-slate-500 self-center">Stored Customers:</span>
                    {customersList.slice(0, 5).map((cust) => (
                      <button
                        key={cust._id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="text-[10px] bg-slate-800 hover:bg-amber-500/20 hover:text-amber-300 text-slate-300 px-2 py-0.5 rounded border border-slate-700 transition-all"
                      >
                        {cust.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mobile No.</label>
                  <input
                    type="text"
                    value={formData.billedTo.mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billedTo: { ...formData.billedTo, mobile: e.target.value },
                        shippedTo: sameAsBilledTo ? { ...formData.shippedTo, mobile: e.target.value } : formData.shippedTo,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Mobile"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">GSTIN / UIN</label>
                  <input
                    type="text"
                    value={formData.billedTo.gstin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billedTo: { ...formData.billedTo, gstin: e.target.value },
                        shippedTo: sameAsBilledTo ? { ...formData.shippedTo, gstin: e.target.value } : formData.shippedTo,
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="GSTIN / UIN"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={formData.billedTo.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      billedTo: { ...formData.billedTo, address: e.target.value },
                      shippedTo: sameAsBilledTo ? { ...formData.shippedTo, address: e.target.value } : formData.shippedTo,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Address"
                />
              </div>
            </div>

            {/* Shipped To */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Shipped To (Delivery Site)</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Delivery Party Name</label>
                <input
                  type="text"
                  value={formData.shippedTo.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippedTo: { ...formData.shippedTo, name: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none uppercase"
                  placeholder="Shipping Party Name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mobile No.</label>
                  <input
                    type="text"
                    value={formData.shippedTo.mobile}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippedTo: { ...formData.shippedTo, mobile: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Mobile"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">GSTIN / UIN</label>
                  <input
                    type="text"
                    value={formData.shippedTo.gstin}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        shippedTo: { ...formData.shippedTo, gstin: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="GSTIN"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={formData.shippedTo.address}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shippedTo: { ...formData.shippedTo, address: e.target.value },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Delivery Address"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Items & Material Details */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h2 className="text-base font-semibold text-amber-400">3. Quarry Goods & Materials</h2>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center space-x-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item Row</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="p-2 w-10">S.N.</th>
                  <th className="p-2">Description of Goods</th>
                  <th className="p-2 w-28">HSN/SAC</th>
                  <th className="p-2 w-24">Qty</th>
                  <th className="p-2 w-24">Unit</th>
                  <th className="p-2 w-28">Price (Rate ₹)</th>
                  <th className="p-2 w-32 text-right">Amount (₹)</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {formData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-950/40">
                    <td className="p-2 text-slate-400 text-center font-bold">{index + 1}.</td>
                    <td className="p-2">
                      <div className="space-y-1">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none"
                          placeholder="e.g. 20MM / CONCRETE SAND"
                        />
                        <div className="flex flex-wrap gap-1 pt-1">
                          <span className="text-[10px] text-slate-500 self-center">Suggestions:</span>
                          {GOODS_SUGGESTIONS.slice(0, 5).map((sugg) => (
                            <button
                              key={sugg}
                              type="button"
                              onClick={() => handleItemChange(index, "description", sugg)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
                            >
                              {sugg}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.hsnSac}
                        onChange={(e) => handleItemChange(index, "hsnSac", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                        placeholder="HSN Code"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={item.qty || ""}
                        onChange={(e) => handleItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-2">
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                      >
                        {UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={item.price || ""}
                        onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                        placeholder="Rate"
                      />
                    </td>
                    <td className="p-2 text-right font-bold text-amber-400 text-sm">
                      ₹{formatCurrency(item.amount || item.qty * item.price)}
                    </td>
                    <td className="p-2 text-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Extra Ledger Charges (Loading & Lorry Freight) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 border-b border-slate-800 pb-2">
            4. Loading & Lorry Freight Charges
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Loading Charges (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.loadingCharges || ""}
                onChange={(e) => setFormData({ ...formData, loadingCharges: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="e.g. 4800.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Lorry Freight (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.lorryFreight || ""}
                onChange={(e) => setFormData({ ...formData, lorryFreight: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="e.g. Freight charges"
              />
            </div>
          </div>
        </div>

        {/* 5. Totals, Taxes & Words */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 border-b border-slate-800 pb-2">
            5. Totals & Tax Breakdown
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Total Quantity Sum</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    readOnly
                    value={formData.totalQty}
                    className="w-2/3 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 font-bold"
                  />
                  <select
                    value={formData.totalQtyUnit}
                    onChange={(e) => setFormData({ ...formData, totalQtyUnit: e.target.value })}
                    className="w-1/3 bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Tax Rate</label>
                <select
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="Exempt">Exempt (0%)</option>
                  <option value="5%">GST 5%</option>
                  <option value="12%">GST 12%</option>
                  <option value="18%">GST 18%</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Material Amount:</span>
                <span className="font-semibold text-white">₹{formatCurrency(formData.taxableAmount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Loading + Freight:</span>
                <span className="font-semibold text-white">
                  ₹{formatCurrency((formData.loadingCharges || 0) + (formData.lorryFreight || 0))}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Tax:</span>
                <span className="font-semibold text-white">₹{formatCurrency(formData.totalTax)}</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-bold text-amber-400">
                <span>Grand Total:</span>
                <span className="text-base">₹{formatCurrency(formData.grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Amount in Words (Auto-calculated)</label>
              <textarea
                rows={3}
                value={formData.amountInWords}
                onChange={(e) => setFormData({ ...formData, amountInWords: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-amber-300 font-semibold focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 6. Bank Details & Terms & Conditions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 border-b border-slate-800 pb-2">
            6. Bank Account & Terms & Signatory
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bank details */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Bank Account Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={formData.bankDetails.accountName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountName: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Account Name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, accountNumber: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                    placeholder="Account Number"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, ifscCode: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="IFSC Code"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bank Name & Branch</label>
                  <input
                    type="text"
                    value={formData.bankDetails.bankBranch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        bankDetails: { ...formData.bankDetails, bankBranch: e.target.value },
                      })
                    }
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                    placeholder="Bank Name & Branch"
                  />
                </div>
              </div>
            </div>

            {/* Terms and Signatory */}
            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              <h3 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Terms & Authorised Signatory</h3>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Terms & Conditions (One per line)</label>
                <textarea
                  rows={3}
                  value={formData.termsAndConditions.join("\n")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      termsAndConditions: e.target.value.split("\n"),
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                  placeholder="Invoice terms..."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Authorised Signatory Text</label>
                <input
                  type="text"
                  value={formData.authorisedSignatoryText}
                  onChange={(e) => setFormData({ ...formData, authorisedSignatoryText: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:border-amber-500 focus:outline-none"
                  placeholder="e.g. for My Quarry Company"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? "Saving Bill..." : "Save Bill"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
