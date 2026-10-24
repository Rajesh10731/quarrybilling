"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { formatCurrency, numberToWords } from "@/lib/utils";
import QuotationPrintView, { type QuotationData, type QuotationItem } from "./QuotationPrintView";
import MaterialSelect from "./MaterialSelect";
import { StepFooter, StepIndicator } from "./FormSteps";
import { computeBillTotals, type DiscountType } from "@/lib/billTotals";

const UNITS = ["Tonne", "CFT", "Trips", "Kg", "Nos", "Load"];
const TAX_RATES = [
  { value: "Exempt", label: "Exempt (0%)" },
  { value: "5%", label: "GST 5%" },
  { value: "12%", label: "GST 12%" },
  { value: "18%", label: "GST 18%" },
];

const QUOTATION_STEPS = [
  { title: "Goods & Amount", subtitle: "Materials, rates, charges & GST" },
  { title: "Customer & Terms", subtitle: "Who it is for, notes & terms" },
  { title: "Review & Save", subtitle: "Check the quotation before saving" },
];

const todayISO = () => new Date().toISOString().split("T")[0];
const plusDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
};
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
const emptyItem = (): QuotationItem => ({ description: "", hsnSac: "", qty: 0, unit: "Tonne", price: 0 });

const inputCls =
  "w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none";
const labelCls = "block text-xs font-medium text-slate-400 mb-1";
const cardCls = "glass-card rounded-3xl p-6 border border-slate-800 space-y-4";
const headCls = "text-base font-extrabold text-amber-400 border-b border-slate-800/80 pb-3 flex items-center gap-2.5";
const badgeCls =
  "w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm";

interface Props {
  initialQuotation?: QuotationData;
  isEditing?: boolean;
  /** Called after a successful save instead of navigating (used by the quotation page edit tab). */
  onSaved?: (quotation: QuotationData) => void;
}

export default function QuotationForm({ initialQuotation, isEditing = false, onSaved }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEditing ? QUOTATION_STEPS.length - 1 : 0);

  // Letterhead used in the preview: the quotation's own when editing, Settings for a new one
  const [company, setCompany] = useState({
    companyName: initialQuotation?.companyName || "",
    companyGstin: initialQuotation?.companyGstin || "",
    companyAddress: initialQuotation?.companyAddress || "",
    companyMobile: initialQuotation?.companyMobile || "",
    authorisedSignatoryText: initialQuotation?.authorisedSignatoryText || "",
  });

  const [form, setForm] = useState(() => {
    const date = initialQuotation?.date || todayISO();
    return {
      quotationNo: initialQuotation?.quotationNo || "",
      date,
      validUntil: initialQuotation?.validUntil || plusDays(date, 15),
      customer: {
        name: initialQuotation?.customer?.name || "",
        mobile: initialQuotation?.customer?.mobile || "",
        gstin: initialQuotation?.customer?.gstin || "",
        address: initialQuotation?.customer?.address || "",
      },
      deliveryPlace: initialQuotation?.deliveryPlace || "",
      items: initialQuotation?.items?.length
        ? initialQuotation.items.map((it) => ({ description: it.description, hsnSac: it.hsnSac || "", qty: it.qty, unit: it.unit || "Tonne", price: it.price }))
        : [emptyItem()],
      loadingCharges: initialQuotation?.loadingCharges || 0,
      lorryFreight: initialQuotation?.lorryFreight || 0,
      taxRate: initialQuotation?.taxRate || "Exempt",
      discountType: (initialQuotation?.discountType as DiscountType) || "NONE",
      discountValue: initialQuotation?.discountValue || 0,
      notes: initialQuotation?.notes || "",
      terms: (initialQuotation?.termsAndConditions || []).join("\n"),
    };
  });

  // Saved customers for quick fill; default terms and letterhead for a new quotation
  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCustomers(data))
      .catch((err) => console.error(err));

    if (isEditing) return;
    fetch("/api/settings")
      .then((res) => res.json())
      .then((s) => {
        const terms: string[] = Array.isArray(s?.termsAndConditions) ? s.termsAndConditions : [];
        if (terms.length) setForm((prev) => (prev.terms ? prev : { ...prev, terms: terms.join("\n") }));
        setCompany({
          companyName: s?.companyName || "",
          companyGstin: s?.companyGstin || "",
          companyAddress: s?.companyAddress || "",
          companyMobile: s?.companyMobile || "",
          authorisedSignatoryText: s?.authorisedSignatoryText || "",
        });
      })
      .catch((err) => console.error(err));
  }, [isEditing]);

  // Suggest the next quotation number (QUO-YYYY-MM-NNN) for the quotation month.
  // Follows the date until the user types their own number.
  const autoQuotationNo = useRef("");
  useEffect(() => {
    if (isEditing) return;
    let stale = false;
    fetch(`/api/quotations?nextQuotationNo=1&date=${encodeURIComponent(form.date || "")}`)
      .then((res) => res.json())
      .then((data) => {
        if (stale || !data?.quotationNo) return;
        const lastSuggested = autoQuotationNo.current;
        autoQuotationNo.current = data.quotationNo;
        setForm((prev) =>
          prev.quotationNo && prev.quotationNo !== lastSuggested ? prev : { ...prev, quotationNo: data.quotationNo }
        );
      })
      .catch((err) => console.error(err));
    return () => {
      stale = true;
    };
  }, [isEditing, form.date]);

  // Live preview of totals (the server recomputes the same way when saving)
  // Same money rules as sales bills (and the server): discount on material, GST after discount, then charges
  const totals = useMemo(() => {
    const t = computeBillTotals(form);
    return { lines: t.items.map((it) => it.amount), taxable: t.taxableAmount, discount: t.discountAmount, tax: t.totalTax, grand: t.grandTotal, error: t.error };
  }, [form]);

  const setCustomerField = (field: keyof typeof form.customer, value: string) =>
    setForm((prev) => ({ ...prev, customer: { ...prev.customer, [field]: value } }));

  const handleCustomerName = (value: string) => {
    const match = customers.find((c) => c.name?.toLowerCase() === value.trim().toLowerCase());
    setForm((prev) => ({
      ...prev,
      customer: match
        ? { name: match.name, mobile: match.mobile || "", gstin: match.gstin || "", address: match.address || "" }
        : { ...prev.customer, name: value },
      deliveryPlace: match?.deliveryPlace && !prev.deliveryPlace ? match.deliveryPlace : prev.deliveryPlace,
    }));
  };

  const setItem = (index: number, field: keyof QuotationItem, value: string | number) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === index ? { ...it, [field]: value } : it)),
    }));

  const filledItems = () => form.items.filter((it) => it.description.trim() || Number(it.qty) || Number(it.price));

  /** Returns what is missing on a step, or "" when it is complete. */
  const validateStep = (index: number): string => {
    if (index === 0) {
      if (!form.quotationNo.trim()) return "Enter the quotation number.";
      if (!form.date) return "Choose the quotation date.";
      if (!form.validUntil || form.validUntil < form.date) return "Valid-until date cannot be before the quotation date.";
      const items = filledItems();
      if (!items.length) return "Add at least one material with quantity and rate.";
      if (totals.error) return totals.error;
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.description.trim()) return `Material ${i + 1}: choose or type the material.`;
        if (!(Number(it.qty) > 0)) return `Material ${i + 1} (${it.description}): enter a quantity greater than 0.`;
        if (!(Number(it.price) > 0)) return `Material ${i + 1} (${it.description}): enter the rate.`;
      }
    }
    if (index === 1 && !form.customer.name.trim()) return "Enter the customer name.";
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
    showStep(Math.min(step + 1, QUOTATION_STEPS.length - 1));
  };

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

  const handleSubmit = async (printAfter: boolean) => {
    for (let i = 0; i < QUOTATION_STEPS.length - 1; i++) {
      const problem = validateStep(i);
      if (problem) {
        setStep(i);
        setError(problem);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const url = isEditing && initialQuotation?._id ? `/api/quotations/${initialQuotation._id}` : "/api/quotations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, items: filledItems(), termsAndConditions: form.terms.split("\n") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save quotation");
      if (onSaved && !printAfter) {
        setSaving(false);
        onSaved(data);
        return;
      }
      router.push(printAfter ? `/quotations/${data._id}/print` : `/quotations/${data._id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Failed to save quotation");
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // What the printed quotation will look like (same rules the server applies)
  const preview: QuotationData = {
    ...company,
    quotationNo: form.quotationNo,
    date: form.date,
    validUntil: form.validUntil,
    customer: form.customer,
    deliveryPlace: form.deliveryPlace,
    items: filledItems().map((it, i) => ({ ...it, sn: i + 1, amount: round2((Number(it.qty) || 0) * (Number(it.price) || 0)) })),
    loadingCharges: Number(form.loadingCharges) || 0,
    lorryFreight: Number(form.lorryFreight) || 0,
    taxRate: form.taxRate,
    taxableAmount: totals.taxable,
    discountType: form.discountType,
    discountValue: form.discountValue,
    discountAmount: totals.discount,
    totalTax: totals.tax,
    grandTotal: totals.grand,
    amountInWords: numberToWords(totals.grand),
    notes: form.notes,
    termsAndConditions: form.terms.split("\n").map((t) => t.trim()).filter(Boolean),
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 text-slate-100 pb-mobile-form">
      <div className="mb-5">
        <button type="button" onClick={() => router.back()} className="flex items-center text-sm text-slate-400 hover:text-white mb-1">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <h1 className="text-2xl font-bold text-white">{isEditing ? "Edit Quotation" : "Create Quotation"}</h1>
        <p className="text-sm text-slate-400">
          Quote rates to a customer and convert it to a sales bill once accepted. Letterhead comes from{" "}
          <Link href="/settings" className="text-amber-400 font-semibold hover:underline">Settings</Link>.
        </p>
      </div>

      <StepIndicator steps={QUOTATION_STEPS} current={step} maxReached={maxStep} onGo={goToStep} />

      {error && (
        <div className="mb-5 p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm" role="alert">
          {error}
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < QUOTATION_STEPS.length - 1) goNext();
          else handleSubmit(false);
        }}
        className="space-y-6"
      >
        {/* Quotation identity: always visible */}
        <div className="glass-card rounded-3xl px-5 py-4 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className={labelCls}>Quotation No. *</label>
            <input className={`${inputCls} font-bold text-amber-400`} value={form.quotationNo} onChange={(e) => setForm({ ...form, quotationNo: e.target.value })} placeholder="QUO-2026-01-001" />
          </div>
          <div>
            <label className={labelCls}>Quotation Date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.date}
              onChange={(e) => {
                const date = e.target.value;
                setForm((prev) => ({ ...prev, date, validUntil: prev.validUntil < date ? plusDays(date, 15) : prev.validUntil }));
              }}
            />
          </div>
          <div>
            <label className={labelCls}>Valid Until *</label>
            <input type="date" className={inputCls} min={form.date} value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
          </div>
          <div className="text-right">
            <span className="block text-xs font-medium text-slate-400">Quotation Total</span>
            <span className="text-2xl font-black text-emerald-400">₹{formatCurrency(totals.grand)}</span>
          </div>
        </div>

        {/* STEP 1: Goods & Amount */}
        {step === 0 && (
          <>
            <div className={cardCls}>
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
                <h2 className="text-base font-extrabold text-amber-400 flex items-center gap-2.5">
                  <span className={badgeCls}>1</span> Materials &amp; Rates
                </h2>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-400"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Material
                </button>
              </div>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                    <div className="col-span-2 sm:col-span-4">
                      <label className={labelCls}>{i + 1}. Material *</label>
                      <MaterialSelect value={item.description} onChange={(v) => setItem(i, "description", v)} className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>HSN/SAC</label>
                      <input className={inputCls} value={item.hsnSac} onChange={(e) => setItem(i, "hsnSac", e.target.value)} placeholder="HSN" />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={labelCls}>Qty *</label>
                      <input type="number" inputMode="decimal" min="0" step="0.01" className={inputCls} value={item.qty || ""} onChange={(e) => setItem(i, "qty", parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Unit</label>
                      <select className={inputCls} value={item.unit} onChange={(e) => setItem(i, "unit", e.target.value)}>
                        {UNITS.map((u) => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <label className={labelCls}>Rate ₹ *</label>
                      <input type="number" inputMode="decimal" min="0" step="0.01" className={inputCls} value={item.price || ""} onChange={(e) => setItem(i, "price", parseFloat(e.target.value) || 0)} placeholder="0" />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <label className={labelCls}>Amount</label>
                      <div className="py-2 text-sm font-bold text-emerald-400">₹{formatCurrency(totals.lines[i])}</div>
                    </div>
                    <div className="sm:col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))}
                        disabled={form.items.length <= 1}
                        title="Remove item"
                        className="p-2 text-red-400 hover:bg-red-950/60 rounded-lg disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`lg:col-span-2 ${cardCls}`}>
                <h2 className={headCls}>
                  <span className={badgeCls}>2</span> Charges &amp; GST
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>Discount</label>
                    <div className="flex gap-2">
                      <div className="flex rounded-lg border border-slate-800 overflow-hidden shrink-0" role="radiogroup" aria-label="Discount type">
                        {(["PERCENT", "AMOUNT"] as const).map((type) => (
                          <button
                            key={type}
                            type="button"
                            role="radio"
                            aria-checked={form.discountType === type}
                            onClick={() =>
                              setForm({
                                ...form,
                                discountType: form.discountType === type ? "NONE" : type,
                                discountValue: form.discountType === type ? 0 : form.discountValue,
                              })
                            }
                            title={type === "PERCENT" ? "Discount as a percentage" : "Discount as a fixed amount"}
                            className={`min-w-[38px] px-2.5 py-2 text-sm font-bold ${form.discountType === type ? "bg-amber-500 text-slate-950" : "bg-slate-950 text-slate-400 hover:text-slate-200"}`}
                          >
                            {type === "PERCENT" ? "%" : "₹"}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        disabled={form.discountType === "NONE"}
                        value={form.discountValue || ""}
                        onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })}
                        placeholder={form.discountType === "NONE" ? "Pick % or ₹" : form.discountType === "PERCENT" ? "e.g. 5" : "e.g. 500"}
                        aria-label={form.discountType === "PERCENT" ? "Discount percentage" : "Discount amount"}
                        className={`${inputCls} min-w-0 disabled:opacity-50`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Loading Charges (₹)</label>
                    <input type="number" min="0" step="0.01" className={inputCls} value={form.loadingCharges || ""} onChange={(e) => setForm({ ...form, loadingCharges: parseFloat(e.target.value) || 0 })} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Lorry Freight (₹)</label>
                    <input type="number" min="0" step="0.01" className={inputCls} value={form.lorryFreight || ""} onChange={(e) => setForm({ ...form, lorryFreight: parseFloat(e.target.value) || 0 })} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>GST</label>
                    <select className={inputCls} value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })}>
                      {TAX_RATES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className={`${cardCls} space-y-2 text-sm h-fit`}>
                <h2 className={headCls}>
                  <span className={badgeCls}>3</span> Quotation Total
                </h2>
                <div className="flex justify-between"><span className="text-slate-400">Material value</span><span>₹{formatCurrency(totals.taxable)}</span></div>
                {totals.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Discount{form.discountType === "PERCENT" ? ` (${form.discountValue}%)` : ""}</span>
                    <span className="text-emerald-400">− ₹{formatCurrency(totals.discount)}</span>
                  </div>
                )}
                {form.taxRate !== "Exempt" && (
                  <div className="flex justify-between"><span className="text-slate-400">GST {form.taxRate}</span><span>₹{formatCurrency(totals.tax)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-slate-400">Loading</span><span>₹{formatCurrency(Number(form.loadingCharges) || 0)}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Lorry freight</span><span>₹{formatCurrency(Number(form.lorryFreight) || 0)}</span></div>
                <div className="flex justify-between border-t border-slate-800 pt-2 text-lg font-black text-emerald-400">
                  <span>Total</span>
                  <span>₹{formatCurrency(totals.grand)}</span>
                </div>
                <p className="text-[11px] text-slate-500">{numberToWords(totals.grand)}</p>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Customer & Terms */}
        {step === 1 && (
          <>
            <div className={cardCls}>
              <h2 className={headCls}>
                <span className={badgeCls}>1</span> Customer
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Customer Name *</label>
                  <input list="quotation-customers" className={`${inputCls} uppercase`} value={form.customer.name} onChange={(e) => handleCustomerName(e.target.value)} placeholder="Type or pick a saved customer" />
                  <datalist id="quotation-customers">
                    {customers.map((c) => (
                      <option key={c._id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelCls}>Mobile</label>
                  <input className={inputCls} value={form.customer.mobile} onChange={(e) => setCustomerField("mobile", e.target.value)} placeholder="Mobile" />
                </div>
                <div>
                  <label className={labelCls}>GSTIN / UIN</label>
                  <input className={`${inputCls} uppercase`} value={form.customer.gstin} onChange={(e) => setCustomerField("gstin", e.target.value)} placeholder="GSTIN" />
                </div>
                <div>
                  <label className={labelCls}>Address</label>
                  <input className={inputCls} value={form.customer.address} onChange={(e) => setCustomerField("address", e.target.value)} placeholder="Address" />
                </div>
                <div>
                  <label className={labelCls}>Delivery Place / Site</label>
                  <input className={inputCls} value={form.deliveryPlace} onChange={(e) => setForm({ ...form, deliveryPlace: e.target.value })} placeholder="e.g. PARUTHIVILAI" />
                </div>
              </div>
            </div>

            <div className={cardCls}>
              <h2 className={headCls}>
                <span className={badgeCls}>2</span> Notes &amp; Terms
              </h2>
              <div>
                <label className={labelCls}>Notes for the customer</label>
                <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Rates are for delivery at site; minimum load 10 Tonne" />
              </div>
              <div>
                <label className={labelCls}>Terms &amp; Conditions (one per line)</label>
                <textarea rows={3} className={inputCls} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder={"50% advance with order\nBalance on delivery"} />
              </div>
            </div>
          </>
        )}

        {/* STEP 3: Review & Save */}
        {step === 2 && (
          <div className="glass-card rounded-3xl p-3 sm:p-6 border border-slate-800 space-y-3">
            <div className="text-sm text-slate-300">
              <span className="font-bold text-white">{form.customer.name}</span> · {preview.items.length} item(s) · valid until {form.validUntil} · Total{" "}
              <span className="font-black text-emerald-400">₹{formatCurrency(totals.grand)}</span>
            </div>
            <p className="text-xs text-slate-500">This is how the quotation will print. Use Back to change anything.</p>
            <div className="paper bg-white p-2 sm:p-6 rounded-xl overflow-x-auto touch-scroll">
              <QuotationPrintView quotation={preview} />
            </div>
          </div>
        )}

        <StepFooter
          step={step}
          totalSteps={QUOTATION_STEPS.length}
          saving={saving}
          total={totals.grand}
          saveLabel={isEditing ? "Save Changes" : "Save Quotation"}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={goNext}
          onSave={() => handleSubmit(false)}
          onSavePrint={() => handleSubmit(true)}
        />
      </form>
    </div>
  );
}
