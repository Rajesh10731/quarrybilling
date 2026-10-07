"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Printer, Save, Trash2 } from "lucide-react";
import { formatCurrency, numberToWords } from "@/lib/utils";
import type { QuotationData, QuotationItem } from "./QuotationPrintView";

const GOODS_SUGGESTIONS = ["20MM JALLY", "40MM JALLY", "10MM JALLY", "M SAND", "P SAND", "CONCRETE SAND", "DUST", "GABION"];
const UNITS = ["Tonne", "CFT", "Trips", "Kg", "Nos", "Load"];
const TAX_RATES = [
  { value: "Exempt", label: "Exempt (0%)" },
  { value: "5%", label: "GST 5%" },
  { value: "12%", label: "GST 12%" },
  { value: "18%", label: "GST 18%" },
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
      notes: initialQuotation?.notes || "",
      terms: (initialQuotation?.termsAndConditions || []).join("\n"),
    };
  });

  // Saved customers for quick fill; next quotation number and default terms for a new quotation
  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setCustomers(data))
      .catch((err) => console.error(err));

    if (isEditing) return;
    fetch("/api/quotations?nextQuotationNo=1")
      .then((res) => res.json())
      .then((data) => data?.quotationNo && setForm((prev) => (prev.quotationNo ? prev : { ...prev, quotationNo: data.quotationNo })))
      .catch((err) => console.error(err));
    fetch("/api/settings")
      .then((res) => res.json())
      .then((s) => {
        const terms: string[] = Array.isArray(s?.termsAndConditions) ? s.termsAndConditions : [];
        if (terms.length) setForm((prev) => (prev.terms ? prev : { ...prev, terms: terms.join("\n") }));
      })
      .catch((err) => console.error(err));
  }, [isEditing]);

  // Live preview of totals (the server recomputes the same way when saving)
  const totals = useMemo(() => {
    const lines = form.items.map((it) => round2((Number(it.qty) || 0) * (Number(it.price) || 0)));
    const taxable = round2(lines.reduce((s, a) => s + a, 0));
    const tax = form.taxRate === "Exempt" ? 0 : round2((taxable * parseFloat(form.taxRate)) / 100);
    const grand = round2(taxable + tax + (Number(form.loadingCharges) || 0) + (Number(form.lorryFreight) || 0));
    return { lines, taxable, tax, grand };
  }, [form.items, form.taxRate, form.loadingCharges, form.lorryFreight]);

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

  const handleSubmit = async (printAfter: boolean) => {
    setError("");
    if (!form.customer.name.trim()) return setError("Enter the customer name.");
    if (!form.items.some((it) => it.description.trim() && Number(it.qty) > 0)) {
      return setError("Add at least one item with a description and quantity.");
    }

    setSaving(true);
    try {
      const url = isEditing && initialQuotation?._id ? `/api/quotations/${initialQuotation._id}` : "/api/quotations";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          termsAndConditions: form.terms.split("\n"),
        }),
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
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 text-slate-100 pb-mobile-form">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <button type="button" onClick={() => router.back()} className="flex items-center text-sm text-slate-400 hover:text-white mb-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h1 className="text-2xl font-bold text-white">{isEditing ? "Edit Quotation" : "Create Quotation"}</h1>
          <p className="text-sm text-slate-400">Quote rates to a customer. Convert it to a sales bill once accepted.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-emerald-400" />
            <span>{saving ? "Saving..." : "Save Quotation"}</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Save &amp; Print</span>
          </button>
        </div>
      </div>

      {error && <div className="mb-6 p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-sm">{error}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(false);
        }}
        className="space-y-6"
      >
        {/* 1. Quotation details */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-amber-400 font-bold">1. Quotation Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Quotation No. *</label>
              <input className={`${inputCls} font-bold text-amber-400`} value={form.quotationNo} onChange={(e) => setForm({ ...form, quotationNo: e.target.value })} placeholder="QT-0001" />
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
            <div>
              <label className={labelCls}>Delivery Place / Site</label>
              <input className={inputCls} value={form.deliveryPlace} onChange={(e) => setForm({ ...form, deliveryPlace: e.target.value })} placeholder="e.g. PARUTHIVILAI" />
            </div>
          </div>
        </div>

        {/* 2. Customer */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <h2 className="text-amber-400 font-bold">2. Customer</h2>
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
          </div>
        </div>

        {/* 3. Items */}
        <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-amber-400 font-bold">3. Materials &amp; Rates</h2>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-amber-400"
            >
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <datalist id="quotation-goods">
            {GOODS_SUGGESTIONS.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
          <div className="space-y-3">
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-12 gap-2 items-end bg-slate-950/60 border border-slate-800 rounded-xl p-3">
                <div className="col-span-2 sm:col-span-4">
                  <label className={labelCls}>{i + 1}. Description *</label>
                  <input list="quotation-goods" className={`${inputCls} uppercase`} value={item.description} onChange={(e) => setItem(i, "description", e.target.value)} placeholder="e.g. 20MM JALLY" />
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
                  <label className={labelCls}>Rate ₹</label>
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

        {/* 4. Charges, tax, notes & totals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-3xl p-6 border border-slate-800 space-y-4">
            <h2 className="text-amber-400 font-bold">4. Charges, GST &amp; Terms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div>
              <label className={labelCls}>Notes for the customer</label>
              <textarea rows={2} className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Rates are for delivery at site; minimum load 10 Tonne" />
            </div>
            <div>
              <label className={labelCls}>Terms &amp; Conditions (one per line)</label>
              <textarea rows={3} className={inputCls} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} placeholder={"50% advance with order\nBalance on delivery"} />
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 border border-slate-800 space-y-2 text-sm h-fit">
            <h2 className="text-amber-400 font-bold mb-2">Quotation Total</h2>
            <div className="flex justify-between"><span className="text-slate-400">Material value</span><span>₹{formatCurrency(totals.taxable)}</span></div>
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
      </form>
    </div>
  );
}
