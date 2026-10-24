"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  Building2,
  Scale,
  IndianRupee,
  AlertCircle,
  FileText,
} from "lucide-react";
import { numberToWords, formatCurrency } from "@/lib/utils";
import PurchasePrintView, { PurchaseData } from "./PurchasePrintView";
import MaterialSelect from "./MaterialSelect";
import { StepFooter, StepIndicator } from "./FormSteps";

const MATERIAL_SUGGESTIONS = [
  "ROUGH STONE / BOULDER",
  "40MM JALLY",
  "20MM JALLY",
  "10MM JALLY",
  "6MM / DUST",
  "M SAND",
  "P SAND",
  "GSB / WET MIX",
  "GRAVEL / RED SOIL",
];

const PURCHASE_STEPS = [
  { title: "Material & Amount", subtitle: "Material, weight, rate, charges & payment" },
  { title: "Vendor & Lorry", subtitle: "Supplier, vehicle, driver & documents" },
  { title: "Review & Save", subtitle: "Check the inward slip before saving" },
];

const COMMON_UNITS = ["Tonne", "Brass", "CFT", "Load", "Trips", "Kg"];

interface PurchaseFormProps {
  initialPurchase?: Partial<PurchaseData>;
  isEditing?: boolean;
}

export default function PurchaseForm({
  initialPurchase,
  isEditing = false,
}: PurchaseFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Weighbridge calculation mode toggle
  const [weighbridgeMode, setWeighbridgeMode] = useState(
    Boolean(initialPurchase?.grossWeight && initialPurchase?.grossWeight > 0)
  );

  // Vendor suggestions from database
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [vendorSearch, setVendorSearch] = useState(initialPurchase?.vendorName || "");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);

  // Form State
  const [formData, setFormData] = useState<PurchaseData>({
    // A new entry gets the next free slip number and the current time after the page loads
    inwardNo: initialPurchase?.inwardNo || "",
    date: initialPurchase?.date || new Date().toISOString().split("T")[0],
    time: initialPurchase?.time || "",
    vendorName: initialPurchase?.vendorName || "",
    vendorMobile: initialPurchase?.vendorMobile || "",
    vendorGstin: initialPurchase?.vendorGstin || "",
    vendorAddress: initialPurchase?.vendorAddress || "",
    vendorChallanNo: initialPurchase?.vendorChallanNo || "",
    ewayBillNo: initialPurchase?.ewayBillNo || "",

    // Lorry & Transport
    vehicleNo: initialPurchase?.vehicleNo || "",
    transportName: initialPurchase?.transportName || "",
    driverName: initialPurchase?.driverName || "",
    driverMobile: initialPurchase?.driverMobile || "",
    unloadingPoint: initialPurchase?.unloadingPoint || "",

    // Material & Quantities
    material: initialPurchase?.material || "ROUGH STONE / BOULDER",
    hsnSac: initialPurchase?.hsnSac || "",
    grossWeight: initialPurchase?.grossWeight || 0,
    tareWeight: initialPurchase?.tareWeight || 0,
    netWeight: initialPurchase?.netWeight || 0,
    qty: initialPurchase?.qty || 0,
    unit: initialPurchase?.unit || "Tonne",
    rate: initialPurchase?.rate || 0,
    materialAmount: initialPurchase?.materialAmount || 0,
    lorryFreight: initialPurchase?.lorryFreight || 0,
    freightPaidBy: initialPurchase?.freightPaidBy || "Paid by Us",
    loadingCharges: initialPurchase?.loadingCharges || 0,
    taxRate: initialPurchase?.taxRate || "Exempt",
    taxAmount: initialPurchase?.taxAmount || 0,
    otherCharges: initialPurchase?.otherCharges || 0,
    grandTotal: initialPurchase?.grandTotal || 0,
    amountInWords: initialPurchase?.amountInWords || "Rupees Zero Only",

    // Payment Settlement
    paymentStatus: initialPurchase?.paymentStatus || "UNPAID",
    paidAmount: initialPurchase?.paidAmount || 0,
    paymentMode: initialPurchase?.paymentMode || "Cash",
    paymentRef: initialPurchase?.paymentRef || "",
    paymentDate: initialPurchase?.paymentDate || "",
    notes: initialPurchase?.notes || "",
  });

  // Fetch registered vendors
  useEffect(() => {
    fetch("/api/vendors")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVendorsList(data);
      })
      .catch((err) => console.error("Failed to load vendors", err));
  }, []);

  // Update Net weight when Gross or Tare changes
  useEffect(() => {
    if (weighbridgeMode) {
      const gross = Number(formData.grossWeight) || 0;
      const tare = Number(formData.tareWeight) || 0;
      const net = Math.max(0, Math.round((gross - tare) * 100) / 100);
      setFormData((prev) => ({
        ...prev,
        netWeight: net,
        qty: net,
      }));
    }
  }, [formData.grossWeight, formData.tareWeight, weighbridgeMode]);

  // Recalculate financial totals dynamically
  useEffect(() => {
    const qty = Number(formData.qty) || 0;
    const rate = Number(formData.rate) || 0;
    const materialAmount = Math.round(qty * rate * 100) / 100;

    let taxRatePercent = 0;
    if (formData.taxRate === "5%") taxRatePercent = 0.05;
    else if (formData.taxRate === "12%") taxRatePercent = 0.12;
    else if (formData.taxRate === "18%") taxRatePercent = 0.18;

    const taxAmount = Math.round(materialAmount * taxRatePercent * 100) / 100;
    const lorryFreight = Number(formData.lorryFreight) || 0;
    const freightToAdd = formData.freightPaidBy === "Paid by Us" ? lorryFreight : 0;
    const loadingCharges = Number(formData.loadingCharges) || 0;
    const otherCharges = Number(formData.otherCharges) || 0;

    const grandTotal = Math.round((materialAmount + freightToAdd + loadingCharges + taxAmount + otherCharges) * 100) / 100;
    const inWords = numberToWords(grandTotal);

    setFormData((prev) => ({
      ...prev,
      materialAmount,
      taxAmount,
      grandTotal,
      amountInWords: inWords,
    }));
  }, [
    formData.qty,
    formData.rate,
    formData.lorryFreight,
    formData.freightPaidBy,
    formData.loadingCharges,
    formData.taxRate,
    formData.otherCharges,
  ]);

  const handleSelectVendor = (v: any) => {
    setFormData((prev) => ({
      ...prev,
      vendorName: v.name,
      vendorMobile: v.mobile || "",
      vendorGstin: v.gstin || "",
      vendorAddress: v.address || "",
    }));
    setVendorSearch(v.name);
    setShowVendorDropdown(false);
  };

  useEffect(() => {
    if (isEditing) return;
    const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
    setFormData((prev) => (prev.time ? prev : { ...prev, time: now }));
  }, [isEditing]);

  // Suggest the next inward number (PUR-YYYY-MM-NNN) for the purchase month.
  // Follows the date until the user types their own number.
  const autoInwardNo = useRef("");
  useEffect(() => {
    if (isEditing) return;
    let stale = false;
    fetch(`/api/purchases?nextInwardNo=1&date=${encodeURIComponent(formData.date || "")}`)
      .then((res) => res.json())
      .then((data) => {
        if (stale || !data?.inwardNo) return;
        const lastSuggested = autoInwardNo.current;
        autoInwardNo.current = data.inwardNo;
        setFormData((prev) =>
          prev.inwardNo && prev.inwardNo !== lastSuggested ? prev : { ...prev, inwardNo: data.inwardNo }
        );
      })
      .catch((err) => console.error(err));
    return () => {
      stale = true;
    };
  }, [isEditing, formData.date]);

  // ---- Step-by-step flow ----
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(isEditing ? PURCHASE_STEPS.length - 1 : 0);

  // Letterhead for the slip preview (from Settings)
  const [company, setCompany] = useState<{ companyName?: string; companyGstin?: string; companyAddress?: string; companyMobile?: string }>({});
  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((s) => setCompany({ companyName: s?.companyName, companyGstin: s?.companyGstin, companyAddress: s?.companyAddress, companyMobile: s?.companyMobile }))
      .catch((err) => console.error(err));
  }, []);

  /** Returns what is missing on a step, or "" when it is complete. */
  const validateStep = (index: number): string => {
    if (index === 0) {
      if (!formData.inwardNo.trim()) return "Enter the inward slip number.";
      if (!formData.date) return "Choose the inward date.";
      if (!formData.material.trim()) return "Choose or type the material.";
      if (!formData.qty || formData.qty <= 0) return "Quantity / weight must be greater than 0.";
      if (!formData.rate || formData.rate <= 0) return "Enter the purchase rate.";
      if (!isEditing && formData.paymentStatus === "PARTIAL") {
        const part = Number(formData.paidAmount) || 0;
        if (part <= 0 || part >= formData.grandTotal) return "For a part payment, enter an amount greater than 0 and less than the total.";
      }
    }
    if (index === 1) {
      if (!formData.vendorName.trim()) return "Enter the vendor / supplier name.";
      if (!formData.vehicleNo.trim()) return "Enter the lorry / vehicle number.";
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
    showStep(Math.min(step + 1, PURCHASE_STEPS.length - 1));
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

  const savePurchase = async (printAfter: boolean) => {
    for (let i = 0; i < PURCHASE_STEPS.length - 1; i++) {
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
      const url = isEditing ? `/api/purchases/${initialPurchase?._id}` : "/api/purchases";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to save purchase entry");
      }

      router.push(printAfter ? `/purchases/${data._id}/print` : `/purchases/${data._id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendorsList.filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 pb-mobile-form">
      {/* Title */}
      <div className="flex items-center space-x-3 mb-5">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-all"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            <span>{isEditing ? "Edit Inward Entry" : "New Inward Load"}</span>
          </h1>
          <p className="text-xs text-slate-400">Stone &amp; sand bought from quarries, with lorry and payment details</p>
        </div>
      </div>

      <StepIndicator steps={PURCHASE_STEPS} current={step} maxReached={maxStep} onGo={goToStep} />

      {error && (
        <div className="mb-5 p-4 bg-red-950/60 border border-red-800/80 rounded-2xl flex items-center gap-3 text-red-200 text-xs sm:text-sm" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step < PURCHASE_STEPS.length - 1) goNext();
          else savePurchase(false);
        }}
        className="space-y-6"
      >
        {/* Inward slip identity: always visible */}
        <div className="glass-card rounded-2xl px-4 sm:px-5 py-4 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Inward Slip No. <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.inwardNo}
              onChange={(e) => setFormData({ ...formData, inwardNo: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Inward Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Entry Time</label>
            <input
              type="text"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              placeholder="10:30 AM"
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div className="text-right">
            <span className="block text-xs font-bold text-slate-400">Total Payable</span>
            <span className="text-2xl font-black text-amber-400">₹{formatCurrency(formData.grandTotal)}</span>
          </div>
        </div>

        {/* STEP 1: Material & Amount */}
        {step === 0 && (
          <>
          {/* Card 4: Material, Weight & Purchase Pricing */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-xs sm:text-sm">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm shrink-0">1</span>
                <Scale className="w-5 h-5" />
                <span className="tracking-tight">Material & Purchase Pricing</span>
              </div>

              {/* Weighbridge Mode Toggle */}
              <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
                <span className="text-slate-400 font-semibold pl-1.5">Weighbridge Mode:</span>
                <button
                  type="button"
                  onClick={() => setWeighbridgeMode(!weighbridgeMode)}
                  className={`px-3 py-2 sm:py-1 rounded-lg font-black transition-all ${
                    weighbridgeMode
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {weighbridgeMode ? "ON (Gross - Tare)" : "OFF (Direct Qty)"}
                </button>
              </div>
            </div>

            {/* Material */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Material / Stone Description <span className="text-red-400">*</span>
              </label>
              <MaterialSelect
                value={formData.material}
                onChange={(v) => setFormData({ ...formData, material: v })}
                options={MATERIAL_SUGGESTIONS}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Weighbridge Mode Inputs */}
            {weighbridgeMode && (
              <div className="bg-slate-950/95 p-4 sm:p-5 rounded-2xl border border-amber-500/40 shadow-xl space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    <span className="tracking-wider uppercase text-[11px]">Electronic Weighbridge Scale</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>LIVE SCALE ACTIVE</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Gross Weight (Truck + Load)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={formData.grossWeight || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, grossWeight: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-100 font-mono font-black focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-3 text-xs font-mono font-bold text-slate-500 uppercase">{formData.unit}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tare Weight (Empty Truck)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        value={formData.tareWeight || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, tareWeight: parseFloat(e.target.value) || 0 })
                        }
                        placeholder="0.00"
                        className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-100 font-mono font-black focus:border-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-3 text-xs font-mono font-bold text-slate-500 uppercase">{formData.unit}</span>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-4 rounded-xl border border-emerald-500/40 shadow-[0_4px_14px_rgba(140,199,166,0.2)] flex flex-col justify-center">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Net Stone Weight (Calculated):</span>
                    <span className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-tight mt-0.5">
                      {formData.netWeight?.toFixed(2)} <span className="text-base text-emerald-300 font-sans font-bold">{formData.unit}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity, Unit & Purchase Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quantity / Weight <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={formData.qty || ""}
                  onChange={(e) => setFormData({ ...formData, qty: parseFloat(e.target.value) || 0 })}
                  placeholder="Qty / Tons"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base text-amber-400 font-black focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Unit
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u} className="bg-slate-900">
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Rate per {formData.unit} (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  required
                  value={formData.rate || ""}
                  onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 380.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base text-emerald-400 font-black focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Lorry Freight & Extra Charges */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lorry Freight (₹)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.lorryFreight || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, lorryFreight: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Freight charge"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Freight Paid By
                </label>
                <select
                  value={formData.freightPaidBy}
                  onChange={(e) => setFormData({ ...formData, freightPaidBy: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Paid by Us" className="bg-slate-900">Paid by Us</option>
                  <option value="Included in Rate" className="bg-slate-900">Included in Rate</option>
                  <option value="Vendor Paid" className="bg-slate-900">Vendor Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Loading / Unloading (₹)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={formData.loadingCharges || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, loadingCharges: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="Handling charge"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  GST Tax Rate
                </label>
                <select
                  value={formData.taxRate}
                  onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Exempt" className="bg-slate-900">Exempt (0%)</option>
                  <option value="5%" className="bg-slate-900">GST 5%</option>
                  <option value="12%" className="bg-slate-900">GST 12%</option>
                  <option value="18%" className="bg-slate-900">GST 18%</option>
                </select>
              </div>
            </div>
          </div>
          {/* Card 5: Grand Total & Payment Settlement */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Payment Settlement */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-xs sm:text-sm border-b border-slate-800/80 pb-3">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm shrink-0">2</span>
                <IndianRupee className="w-5 h-5" />
                <span className="tracking-tight">Payment Settlement</span>
              </div>

              {isEditing && (
                <p className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
                  Payments are managed in the payment history on the purchase page. Paid so far: ₹{formatCurrency(formData.paidAmount || 0)} ({formData.paymentStatus}).
                </p>
              )}
              <fieldset disabled={isEditing} className={`space-y-4 ${isEditing ? "hidden" : ""}`}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentStatus: e.target.value as "UNPAID" | "PAID" | "PARTIAL",
                        paidAmount:
                          e.target.value === "PAID" ? formData.grandTotal : formData.paidAmount,
                      })
                    }
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-bold focus:outline-none ${
                      formData.paymentStatus === "PAID"
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/40"
                        : formData.paymentStatus === "PARTIAL"
                        ? "bg-blue-950/40 text-blue-400 border-blue-500/40"
                        : "bg-red-950/40 text-red-400 border-red-500/40"
                    }`}
                  >
                    <option value="UNPAID" className="bg-slate-900 text-red-400">UNPAID</option>
                    <option value="PAID" className="bg-slate-900 text-emerald-400">PAID</option>
                    <option value="PARTIAL" className="bg-slate-900 text-blue-400">PARTIAL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={formData.paidAmount || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, paidAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Paid so far"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Cash" className="bg-slate-900">Cash</option>
                    <option value="UPI" className="bg-slate-900">UPI (GPay/PhonePe)</option>
                    <option value="Bank Transfer" className="bg-slate-900">Bank Transfer</option>
                    <option value="Cheque" className="bg-slate-900">Cheque</option>
                    <option value="Credit" className="bg-slate-900">Credit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Ref / UTR No
                  </label>
                  <input
                    type="text"
                    value={formData.paymentRef}
                    onChange={(e) => setFormData({ ...formData, paymentRef: e.target.value })}
                    placeholder="UPI ref or Cheque no"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              </fieldset>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Remarks / Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Quarry Pit 3 material, standard quality"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Live Cost Summary Card */}
            <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="text-sm font-black text-amber-400 uppercase tracking-wide border-b border-slate-800 pb-2">
                  Cost Summary
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Material Subtotal:</span>
                    <span className="font-bold text-slate-100">
                      ₹{formatCurrency(formData.materialAmount)}
                    </span>
                  </div>

                  {formData.lorryFreight && formData.lorryFreight > 0 ? (
                    <div className="flex justify-between text-slate-300">
                      <span>Lorry Freight ({formData.freightPaidBy}):</span>
                      <span className="font-semibold text-slate-100">
                        ₹{formatCurrency(formData.lorryFreight)}
                      </span>
                    </div>
                  ) : null}

                  {formData.loadingCharges && formData.loadingCharges > 0 ? (
                    <div className="flex justify-between text-slate-300">
                      <span>Loading / Handling:</span>
                      <span className="font-semibold text-slate-100">
                        ₹{formatCurrency(formData.loadingCharges)}
                      </span>
                    </div>
                  ) : null}

                  {formData.taxAmount && formData.taxAmount > 0 ? (
                    <div className="flex justify-between text-slate-300">
                      <span>GST ({formData.taxRate}):</span>
                      <span className="font-semibold text-slate-100">
                        ₹{formatCurrency(formData.taxAmount)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                    Total Net Payable
                  </div>
                  <div className="text-3xl font-black text-amber-400 mt-1">
                    ₹{formatCurrency(formData.grandTotal)}
                  </div>
                  <div className="text-[11px] text-slate-400 italic mt-1 leading-tight">
                    {formData.amountInWords}
                  </div>
                </div>

                {/* Pending Balance Box */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Paid:</span>
                    <span className="font-bold text-emerald-400">₹{formatCurrency(formData.paidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balance Due:</span>
                    <span className="font-bold text-amber-400">
                      ₹{formatCurrency(Math.max(0, formData.grandTotal - (formData.paidAmount || 0)))}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
          </>
        )}

        {/* STEP 2: Vendor & Lorry */}
        {step === 1 && (
          <>
          {/* Card 2: Vendor Details */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-xs sm:text-sm">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm shrink-0">1</span>
                <Building2 className="w-4 h-4" />
                <span className="tracking-tight">Vendor / Supplier Details</span>
              </div>
            </div>

            {/* Vendor Name with search dropdown */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Vendor / Quarry Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.vendorName}
                onFocus={() => setShowVendorDropdown(true)}
                onChange={(e) => {
                  setFormData({ ...formData, vendorName: e.target.value });
                  setVendorSearch(e.target.value);
                  setShowVendorDropdown(true);
                }}
                placeholder="e.g. Sri Murugan Blue Metals, SK Quarry"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500/50"
              />

              {showVendorDropdown && filteredVendors.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl max-h-48 overflow-y-auto z-50 shadow-2xl divide-y divide-slate-800">
                  {filteredVendors.map((v) => (
                    <div
                      key={v._id}
                      onClick={() => handleSelectVendor(v)}
                      className="p-3 hover:bg-slate-800 cursor-pointer transition-colors text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-100">{v.name}</div>
                        <div className="text-slate-400 text-[11px]">{v.mobile || "No phone"} • {v.quarryLocation || v.address || "No address"}</div>
                      </div>
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vendor Phone
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formData.vendorMobile}
                  onChange={(e) => setFormData({ ...formData, vendorMobile: e.target.value })}
                  placeholder="10-digit mobile"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vendor GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={formData.vendorGstin}
                  onChange={(e) => setFormData({ ...formData, vendorGstin: e.target.value.toUpperCase() })}
                  placeholder="33AAAAA0000A1Z5"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 uppercase focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Quarry Source Pit / Location
              </label>
              <input
                type="text"
                value={formData.vendorAddress}
                onChange={(e) => setFormData({ ...formData, vendorAddress: e.target.value })}
                placeholder="e.g. Karur North Quarry Pit, Trichy Road"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
          {/* Card 3: Lorry Transport & Vehicle Details */}
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-3 gap-1">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-xs sm:text-sm">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm shrink-0">2</span>
                <Truck className="w-5 h-5" />
                <span className="tracking-tight">Lorry & Transport Details</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Truck vehicle and driver information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Lorry / Vehicle No. <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.vehicleNo}
                  onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                  placeholder="TN 28 AA 1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-amber-400 font-mono font-black uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Transporter Name
                </label>
                <input
                  type="text"
                  value={formData.transportName}
                  onChange={(e) => setFormData({ ...formData, transportName: e.target.value })}
                  placeholder="e.g. Sri Ram Transport / Own"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  placeholder="Driver name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Driver Mobile
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={formData.driverMobile}
                  onChange={(e) => setFormData({ ...formData, driverMobile: e.target.value })}
                  placeholder="Mobile number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Quarry Unloading Pit / Stockyard
              </label>
              <input
                type="text"
                value={formData.unloadingPoint}
                onChange={(e) => setFormData({ ...formData, unloadingPoint: e.target.value })}
                placeholder="e.g. Crusher Hopper 1, Stockyard Pit B"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
            {/* Vendor documents */}
            <div className="glass-card rounded-2xl p-4 sm:p-6 border border-slate-800 space-y-4">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold text-xs sm:text-sm border-b border-slate-800/80 pb-3">
                <span className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black shadow-sm shrink-0">3</span>
                <FileText className="w-4 h-4" />
                <span className="tracking-tight">Vendor Documents</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Vendor DC / Bill No.</label>
                  <input
                    type="text"
                    value={formData.vendorChallanNo}
                    onChange={(e) => setFormData({ ...formData, vendorChallanNo: e.target.value })}
                    placeholder="Vendor DC No"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">E-Way Bill Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.ewayBillNo}
                    onChange={(e) => setFormData({ ...formData, ewayBillNo: e.target.value })}
                    placeholder="12-digit E-Way bill number (Optional)"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 3: Review & Save */}
        {step === 2 && (
          <div className="glass-card rounded-2xl p-3 sm:p-6 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row justify-between gap-2 text-sm">
              <div className="text-slate-300">
                <span className="font-bold text-white">{formData.vendorName}</span> · {formData.material} · {formData.qty} {formData.unit} · Total{" "}
                <span className="font-black text-amber-400">₹{formatCurrency(formData.grandTotal)}</span>
              </div>
              <div className="text-slate-400">
                {isEditing
                  ? "Payments are unchanged by editing."
                  : formData.paymentStatus === "PAID"
                  ? `Full payment of ₹${formatCurrency(formData.grandTotal)} will be recorded.`
                  : formData.paymentStatus === "PARTIAL"
                  ? `A payment of ₹${formatCurrency(Number(formData.paidAmount) || 0)} will be recorded.`
                  : "No payment will be recorded (UNPAID)."}
              </div>
            </div>
            <p className="text-xs text-slate-500">This is how the inward slip will print. Use Back to change anything.</p>
            <div className="paper bg-white p-2 sm:p-6 rounded-xl overflow-x-auto touch-scroll">
              <PurchasePrintView purchase={formData} {...company} />
            </div>
          </div>
        )}

        <StepFooter
          step={step}
          totalSteps={PURCHASE_STEPS.length}
          saving={loading}
          total={formData.grandTotal}
          saveLabel={isEditing ? "Save Changes" : "Save Inward Load"}
          onBack={() => setStep((s) => Math.max(0, s - 1))}
          onNext={goNext}
          onSave={() => savePurchase(false)}
          onSavePrint={() => savePurchase(true)}
        />
      </form>
    </div>
  );
}
