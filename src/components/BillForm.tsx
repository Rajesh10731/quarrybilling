"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Copy, UserCheck } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import BillPrintView, { BillData } from "./BillPrintView";
import { StepFooter, StepIndicator } from "./FormSteps";
import MaterialSelect from "./MaterialSelect";
import { computeBillTotals, type DiscountType } from "@/lib/billTotals";

const BILL_STEPS = [
  { title: "Goods & Amount", subtitle: "Materials, charges, tax & payment" },
  { title: "Customer & Transport", subtitle: "Billed to, shipped to, lorry details" },
  { title: "Review & Save", subtitle: "Check the invoice before saving" },
];

const PAYMENT_CHOICES: { value: "UNPAID" | "PARTIAL" | "PAID"; label: string; hint: string; selectedCls: string }[] = [
  { value: "UNPAID", label: "Not paid", hint: "Customer pays later", selectedCls: "bg-red-950 border-red-800 text-red-300" },
  { value: "PARTIAL", label: "Advance", hint: "Part amount received now", selectedCls: "bg-amber-950 border-amber-700 text-amber-300" },
  { value: "PAID", label: "Full payment", hint: "Whole amount received now", selectedCls: "bg-emerald-950 border-emerald-700 text-emerald-300" },
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
    discountType: (initialBill?.discountType as DiscountType) || "NONE",
    discountValue: initialBill?.discountValue || 0,
    discountAmount: initialBill?.discountAmount || 0,
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

  // Suggest the next free invoice number for a new bill
  useEffect(() => {
    if (isEditing || initialBill?.invoiceNo) return;
    fetch("/api/bills?nextInvoiceNo=1")
      .then((res) => res.json())
      .then((data) => {
        if (data?.invoiceNo) setFormData((prev) => ({ ...prev, invoiceNo: data.invoiceNo }));
      })
      .catch((err) => console.error(err));
  }, [isEditing, initialBill?.invoiceNo]);

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
              companyAddress: settings.companyAddress || "",
              companyMobile: settings.companyMobile || "",
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

  // Recalculate totals (same rules as the server) whenever amounts, discount, GST or charges change
  useEffect(() => {
    const t = computeBillTotals(formData);
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => ({ ...item, sn: idx + 1, amount: t.items[idx]?.amount ?? 0 })),
      totalQty: t.totalQty,
      taxableAmount: t.taxableAmount,
      discountAmount: t.discountAmount,
      totalTax: t.totalTax,
      grandTotal: t.grandTotal,
      amountInWords: t.amountInWords,
    }));
  }, [
    JSON.stringify(formData.items.map((i) => ({ q: i.qty, p: i.price }))),
    formData.taxRate,
    formData.loadingCharges,
    formData.lorryFreight,
    formData.discountType,
    formData.discountValue,
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
          unit: prev.items[0]?.unit || "Tonne",
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

  // ---- Step-by-step flow ----
  const [step, setStep] = useState(0);
  // When editing, every step already has data, so all steps can be opened directly
  const [maxStep, setMaxStep] = useState(isEditing ? BILL_STEPS.length - 1 : 0);

  const filledItems = () =>
    formData.items.filter((it) => String(it.description || "").trim() || Number(it.qty) || Number(it.price));

  /** Returns a message describing what is missing on a step, or "" when the step is complete. */
  const validateStep = (index: number): string => {
    if (index === 0) {
      if (!String(formData.invoiceNo || "").trim()) return "Enter the invoice number.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.date || "")) return "Choose the invoice date.";
      const items = filledItems();
      if (!items.length) return "Add at least one material with quantity and rate.";
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!String(it.description || "").trim()) return `Material ${i + 1}: choose or type the material.`;
        if (!(Number(it.qty) > 0)) return `Material ${i + 1} (${it.description}): enter a quantity greater than 0.`;
        if (!(Number(it.price) > 0)) return `Material ${i + 1} (${it.description}): enter the rate.`;
      }
      const discountProblem = computeBillTotals(formData).error;
      if (discountProblem) return discountProblem;
      if (!isEditing && formData.paymentStatus === "PARTIAL") {
        const part = Number(formData.paidAmount) || 0;
        if (part <= 0 || part >= formData.grandTotal) {
          return "For an advance, enter an amount greater than 0 and less than the grand total.";
        }
      }
    }
    if (index === 1 && !String(formData.billedTo?.name || "").trim()) {
      return "Enter the customer (Billed To) name.";
    }
    return "";
  };

  const showStep = (index: number) => {
    setError("");
    setStep(index);
    setMaxStep((m) => Math.max(m, index));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goNext = () => {
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    showStep(Math.min(step + 1, BILL_STEPS.length - 1));
  };

  // Clicking the step indicator: going back is always allowed; going forward checks the steps in between
  const goToStep = (index: number) => {
    if (index <= step) return showStep(index);
    for (let i = step; i < index; i++) {
      const problem = validateStep(i);
      if (problem) {
        setStep(i);
        setError(problem);
        return;
      }
    }
    showStep(index);
  };

  const saveBill = async (shouldPrintAfter: boolean) => {
    for (let i = 0; i < BILL_STEPS.length - 1; i++) {
      const problem = validateStep(i);
      if (problem) {
        setStep(i);
        setError(problem);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setError("");
    setLoading(true);

    try {
      // Empty rows are dropped; company header, bank details and terms are added by the server from Settings
      const items = filledItems().map((it, i) => ({ ...it, sn: i + 1 }));
      const totalQtyUnit = items[0]?.unit || "Tonne";
      const url = isEditing && initialBill?._id ? `/api/bills/${initialBill._id}` : "/api/bills";
      const method = isEditing && initialBill?._id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, items, totalQtyUnit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save bill");
      }

      router.push(shouldPrintAfter ? `/bills/${data._id}/print` : `/bills/${data._id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 text-slate-100 pb-mobile-form">
      {/* Title */}
      <div className="mb-5">
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
        <p className="text-sm text-slate-400">
          Company header, bank details and terms are printed from{" "}
          <Link href="/settings" className="text-amber-400 font-semibold hover:underline">
            Settings
          </Link>
          .
        </p>
      </div>

      <StepIndicator steps={BILL_STEPS} current={step} maxReached={maxStep} onGo={goToStep} />

      {error && (
        <div className="mb-5 p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < BILL_STEPS.length - 1) goNext();
          else saveBill(false);
        }}
        className="space-y-6"
      >
        {/* Bill identity: always visible */}
        <div className="glass-card rounded-3xl px-5 py-4 border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Invoice No. *</label>
            <input
              type="text"
              value={formData.invoiceNo}
              onChange={(e) => setFormData({ ...formData, invoiceNo: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-400 font-bold focus:border-amber-500 focus:outline-none"
              placeholder="e.g. 11439"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Invoice Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div className="text-right">
            <span className="block text-xs font-medium text-slate-400">Grand Total</span>
            <span className="text-2xl font-black text-emerald-400">₹{formatCurrency(formData.grandTotal)}</span>
          </div>
        </div>

        {/* STEP 1: Goods & Amount */}
        {step === 0 && (
          <>
            {/* 3. Items & Material Details */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <h2 className="text-base font-extrabold text-amber-400 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">1</span>
                  <span className="tracking-tight">Quarry Goods & Materials</span>
                </h2>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="flex items-center space-x-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg shadow-md transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Material</span>
                </button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="p-2 w-10">S.N.</th>
                      <th className="p-2 w-[446px]">Description of Goods</th>
                      <th className="p-2 w-28">HSN/SAC</th>
                      <th className="p-2 w-[125px]">Qty / Weight</th>
                      <th className="p-2 w-[125px]">Unit</th>
                      <th className="p-2 w-[146px]">Price (Rate ₹)</th>
                      <th className="p-2 w-[147px] text-right">Amount (₹)</th>
                      <th className="p-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {formData.items.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-950/40">
                        <td className="p-2 text-slate-400 text-center font-bold">{index + 1}.</td>
                        <td className="p-2">
                          <MaterialSelect
                            required
                            value={item.description}
                            onChange={(v) => handleItemChange(index, "description", v)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none"
                          />
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
                            inputMode="decimal"
                            step="0.01"
                            required
                            value={item.qty || ""}
                            onChange={(e) => handleItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
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
                            inputMode="decimal"
                            step="0.01"
                            required
                            value={item.price || ""}
                            onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none"
                            placeholder="Rate ₹"
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

              {/* Mobile Card View for Items (Thumb-friendly & easy for workers) */}
              <div className="block sm:hidden space-y-4">
                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="bg-slate-950/70 border border-slate-800 p-4 rounded-2xl space-y-3 relative shadow-md"
                  >
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                      <span className="text-xs font-black text-amber-400">
                        Item #{index + 1}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(index)}
                          className="text-xs text-red-400 hover:bg-red-950/50 px-2 py-1 rounded-lg flex items-center gap-1 border border-red-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                    {/* Material description */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-300">
                        Material Description *
                      </label>
                      <MaterialSelect
                        required
                        value={item.description}
                        onChange={(v) => handleItemChange(index, "description", v)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    {/* Qty & Unit */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Quantity / Weight *
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          required
                          value={item.qty || ""}
                          onChange={(e) => handleItemChange(index, "qty", parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-base text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Unit
                        </label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:border-amber-500 focus:outline-none"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Price and Calculated Amount */}
                    <div className="grid grid-cols-2 gap-2 items-center pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Rate per Unit (₹) *
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          required
                          value={item.price || ""}
                          onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-base text-white font-bold focus:border-amber-500 focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Amount:</span>
                        <span className="text-base font-black text-amber-400">
                          ₹{formatCurrency(item.amount || item.qty * item.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 4. Extra Ledger Charges (Loading & Lorry Freight) */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-extrabold text-amber-400 border-b border-slate-800/80 pb-3 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">2</span>
                <span className="tracking-tight">Loading & Lorry Freight Charges</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Loading Charges (₹)</label>
                  <input
                    type="number"
                    inputMode="decimal"
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
                    inputMode="decimal"
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
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-extrabold text-amber-400 border-b border-slate-800/80 pb-3 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">3</span>
                <span className="tracking-tight">Totals & Tax Summary</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Breakdown, with the GST rate chosen right next to the tax it creates */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-2">
                  <div className="flex justify-between items-center py-[7px] border-b border-slate-800 text-[12px]">
                    <span className="text-slate-400 font-medium">Material Amount</span>
                    <span className="font-bold text-white">₹{formatCurrency(formData.taxableAmount)}</span>
                  </div>
                  {/* Discount: a % of the material amount or a fixed ₹ amount */}
                  <div className="flex justify-between items-center gap-3 py-[5px] border-b border-slate-800 text-[12px]">
                    <div className="flex items-center gap-2 text-slate-400 font-medium">
                      Discount
                      <div className="flex rounded-lg border border-slate-800 overflow-hidden" role="radiogroup" aria-label="Discount type">
                        {(["PERCENT", "AMOUNT"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={formData.discountType === type}
                            onClick={() =>
                              setFormData({
                                ...formData,
                                discountType: formData.discountType === type ? "NONE" : type,
                                discountValue: formData.discountType === type ? 0 : formData.discountValue,
                              })
                            }
                            title={type === "PERCENT" ? "Discount as a percentage" : "Discount as a fixed amount"}
                            className={`min-w-[34px] px-2.5 py-1.5 text-[12px] font-bold ${formData.discountType === type ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-slate-200"}`}
                          >
                            {type === "PERCENT" ? "%" : "₹"}
                          </button>
                        ))}
                      </div>
                      {formData.discountType !== "NONE" && (
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          max={formData.discountType === "PERCENT" ? 100 : undefined}
                          step="0.01"
                          value={formData.discountValue || ""}
                          onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                          placeholder={formData.discountType === "PERCENT" ? "e.g. 5" : "e.g. 500"}
                          aria-label={formData.discountType === "PERCENT" ? "Discount percentage" : "Discount amount"}
                          className="w-20 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] text-white focus:border-amber-500 focus:outline-none"
                        />
                      )}
                    </div>
                    <span className={`font-bold ${formData.discountAmount ? "text-emerald-400" : "text-white"}`}>
                      {formData.discountAmount ? `− ₹${formatCurrency(formData.discountAmount)}` : "₹0.00"}
                    </span>
                  </div>
                  {[
                    ["Loading Charges", Number(formData.loadingCharges) || 0],
                    ["Lorry Freight", Number(formData.lorryFreight) || 0],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between items-center py-[7px] border-b border-slate-800 text-[12px]">
                      <span className="text-slate-400 font-medium">{label}</span>
                      <span className="font-bold text-white">₹{formatCurrency(Number(value) || 0)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center gap-3 py-[5px] text-[12px]">
                    <label className="flex items-center gap-2 text-slate-400 font-medium">
                      GST
                      <select
                        value={formData.taxRate}
                        onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                        title="GST is calculated on the material amount after discount"
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[12px] text-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="Exempt">Exempt (0%)</option>
                        <option value="5%">5%</option>
                        <option value="12%">12%</option>
                        <option value="18%">18%</option>
                      </select>
                    </label>
                    <span className="font-bold text-white">₹{formatCurrency(formData.totalTax)}</span>
                  </div>
                </div>

                {/* Grand total */}
                <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-amber-500/20 rounded-2xl px-4 py-3 shadow-inner glow-amber flex flex-col items-center justify-center text-center">
                  <span className="text-[12.6px] font-black text-amber-400 uppercase tracking-wide">Grand Total</span>
                  <span className="text-[25.2px] leading-tight font-black text-emerald-400 mt-1">₹{formatCurrency(formData.grandTotal)}</span>
                  <span className="mt-1 text-[11px] font-semibold text-amber-300">{formData.amountInWords}</span>
                </div>
              </div>
            </div>
            {/* Payment at billing */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-extrabold text-amber-400 border-b border-slate-800/80 pb-3 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">4</span>
                <span className="tracking-tight">Payment</span>
              </h2>
              {isEditing ? (
                <div className="text-sm text-slate-300">
                  <span className="font-bold">{formData.paymentStatus || "UNPAID"}</span> · ₹{formatCurrency(Number(formData.paidAmount) || 0)} received.{" "}
                  <span className="text-slate-400">Record or delete payments from the bill page.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Payment received now">
                    {PAYMENT_CHOICES.map((choice) => {
                      const selected = (formData.paymentStatus || "UNPAID") === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setFormData({ ...formData, paymentStatus: choice.value, paidAmount: choice.value === "PARTIAL" ? formData.paidAmount : 0 })}
                          className={`text-left rounded-2xl border px-4 py-3 transition-all ${
                            selected ? choice.selectedCls : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <span className="block text-sm font-black">{choice.label}</span>
                          <span className="block text-[11px] opacity-80">{choice.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                  {formData.paymentStatus === "PARTIAL" && (
                    <div className="max-w-xs">
                      <label className="block text-xs font-medium text-slate-400 mb-1">Advance received now (₹) *</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={formData.paidAmount || ""}
                        onChange={(e) => setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 5000"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500">An advance or full payment is saved as a payment receipt for this bill.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* STEP 2: Customer & Transport */}
        {step === 1 && (
          <>
            {/* 2. Customer Parties (Billed To & Shipped To) */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-amber-400 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">1</span>
                    <UserCheck className="w-4 h-4" />
                    <span className="tracking-tight">Customer Party Details</span>
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
            {/* Transport & supply */}
            <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-base font-extrabold text-amber-400 border-b border-slate-800/80 pb-3 flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm">2</span>
                <span className="tracking-tight">Transport &amp; Supply Details</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Vehicle No. (Lorry #)</label>
                  <input
                    type="text"
                    value={formData.vehicleNo}
                    onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-300 font-mono font-bold uppercase tracking-wider focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. TN 74 BK 6973"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Transport Name</label>
                  <input
                    type="text"
                    value={formData.transport}
                    onChange={(e) => setFormData({ ...formData, transport: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. Sri Ram Transport / Own"
                  />
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
                  <label className="block text-xs font-medium text-slate-400 mb-1">Delivery Place / Site</label>
                  <input
                    type="text"
                    value={formData.deliveryPlace}
                    onChange={(e) => setFormData({ ...formData, deliveryPlace: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. PARUTHIVILAI"
                  />
                </div>
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
              </div>
            </div>
          </>
        )}

        {/* STEP 3: Review & Save */}
        {step === 2 && (
          <div className="glass-card rounded-3xl p-3 sm:p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm">
              <div className="text-slate-300">
                <span className="font-bold text-white">{formData.billedTo.name}</span> · {formData.items.filter((it) => it.description.trim()).length} item(s) · Total{" "}
                <span className="font-black text-emerald-400">₹{formatCurrency(formData.grandTotal)}</span>
              </div>
              <div className="text-slate-400">
                {isEditing
                  ? "Payments are unchanged by editing."
                  : formData.paymentStatus === "PAID"
                  ? `A receipt of ₹${formatCurrency(formData.grandTotal)} will be recorded.`
                  : formData.paymentStatus === "PARTIAL"
                  ? `An advance receipt of ₹${formatCurrency(Number(formData.paidAmount) || 0)} will be recorded.`
                  : "No payment will be recorded (UNPAID)."}
              </div>
            </div>
            {!formData.companyName && (
              <div className="p-3 rounded-xl bg-red-950 border border-red-800 text-red-300 text-xs">
                Your company name, address and bank details are not set, so the invoice header is blank.{" "}
                <Link href="/settings" className="font-bold underline">
                  Open Settings → Company Profile
                </Link>{" "}
                to add them (your entries here are kept if you come back).
              </div>
            )}
            <p className="text-xs text-slate-500">This is how the invoice will print. Use Back to change anything.</p>
            <div className="paper bg-white p-2 sm:p-6 rounded-xl overflow-x-auto touch-scroll">
              <BillPrintView
                bill={{
                  ...formData,
                  items: formData.items.filter((it) => it.description.trim()),
                  totalQtyUnit: formData.items.find((it) => it.description.trim())?.unit || "Tonne",
                }}
              />
            </div>
          </div>
        )}

        <StepFooter
          step={step}
          totalSteps={BILL_STEPS.length}
          saving={loading}
          total={formData.grandTotal}
          saveLabel={isEditing ? "Save Changes" : "Save Bill"}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={goNext}
          onSave={() => saveBill(false)}
          onSavePrint={() => saveBill(true)}
        />
      </form>
    </div>
  );
}
