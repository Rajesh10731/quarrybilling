"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Save, CheckCircle2, Building, Landmark, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyName: "RBMS QUARRY SERVICES",
    companyGstin: "33AAAAA0000A1Z5",
    companyAddress: "Nagercoil, Tamilnadu",
    companyMobile: "",
    documentTitle: "BILL OF SUPPLY",
    copyLabel: "Original Copy",
    bankAccountName: "ROBERT MOBILE GARDEN",
    bankAccountNumber: "006302000077060",
    bankIfsc: "IOBA0000063",
    bankBranch: "IOB NAGERCOIL",
    termsAndConditions: [
      "F.A.O.F.",
      "1. Goods once sold will not be taken back.",
      "2. Interest @ 18% p.a. will be charged if the payment is not made within the stipulated time.",
      "3. Subject to 'Tamilnadu' Jurisdiction only.",
    ],
    authorisedSignatoryText: "for RBMS",
  });

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (res.status === 401) {
          router.push("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.companyName) {
          setFormData({
            companyName: data.companyName || "",
            companyGstin: data.companyGstin || "",
            companyAddress: data.companyAddress || "",
            companyMobile: data.companyMobile || "",
            documentTitle: data.documentTitle || "BILL OF SUPPLY",
            copyLabel: data.copyLabel || "Original Copy",
            bankAccountName: data.bankAccountName || "",
            bankAccountNumber: data.bankAccountNumber || "",
            bankIfsc: data.bankIfsc || "",
            bankBranch: data.bankBranch || "",
            termsAndConditions: data.termsAndConditions || [],
            authorisedSignatoryText: data.authorisedSignatoryText || "for RBMS",
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update settings");
      }

      setSuccess("Company & Bank settings saved successfully! Future bills will pre-populate with these defaults.");
    } catch (err: any) {
      setError(err.message || "Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>Company & Bank Defaults Settings</span>
          </h1>
          <p className="text-sm text-slate-400">
            Configure default company information, bank details, and invoice terms. (You can still edit any of these per bill).
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-2xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Branding */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Building className="w-4 h-4" />
            <span>Company Profile & Header</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company Name</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Supplier GSTIN</label>
              <input
                type="text"
                value={formData.companyGstin}
                onChange={(e) => setFormData({ ...formData, companyGstin: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Company Address</label>
              <input
                type="text"
                value={formData.companyAddress}
                onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Mobile / Phone</label>
              <input
                type="text"
                value={formData.companyMobile}
                onChange={(e) => setFormData({ ...formData, companyMobile: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Default Document Title</label>
              <input
                type="text"
                value={formData.documentTitle}
                onChange={(e) => setFormData({ ...formData, documentTitle: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="BILL OF SUPPLY"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Default Copy Label</label>
              <input
                type="text"
                value={formData.copyLabel}
                onChange={(e) => setFormData({ ...formData, copyLabel: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="Original Copy"
              />
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <Landmark className="w-4 h-4" />
            <span>Default Bank Account Details</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Holder Name</label>
              <input
                type="text"
                value={formData.bankAccountName}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Account Number</label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">IFSC Code</label>
              <input
                type="text"
                value={formData.bankIfsc}
                onChange={(e) => setFormData({ ...formData, bankIfsc: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Bank Name & Branch</label>
              <input
                type="text"
                value={formData.bankBranch}
                onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                placeholder="e.g. IOB NAGERCOIL"
              />
            </div>
          </div>
        </div>

        {/* Terms & Signatory */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-base font-semibold text-amber-400 flex items-center gap-2 border-b border-slate-800 pb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Default Terms & Authorised Signatory</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Terms & Conditions (One per line)
            </label>
            <textarea
              rows={4}
              value={formData.termsAndConditions.join("\n")}
              onChange={(e) =>
                setFormData({ ...formData, termsAndConditions: e.target.value.split("\n") })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Authorised Signatory Text</label>
            <input
              type="text"
              value={formData.authorisedSignatoryText}
              onChange={(e) => setFormData({ ...formData, authorisedSignatoryText: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none"
              placeholder="for RBMS"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Settings..." : "Save Default Settings"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
