"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Search,
  Plus,
  Truck,
  Phone,
  MapPin,
  Trash2,
  Eye,
  X,
  AlertCircle,
  IndianRupee,
  FileText,
  Edit2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function VendorsListPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    gstin: "",
    address: "",
    quarryLocation: "",
    openingBalance: 0,
  });

  const fetchVendors = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/vendors?query=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVendors(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = editingVendor ? `/api/vendors/${editingVendor._id}` : "/api/vendors";
      const method = editingVendor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddModal(false);
        setEditingVendor(null);
        setFormData({
          name: "",
          mobile: "",
          gstin: "",
          address: "",
          quarryLocation: "",
          openingBalance: 0,
        });
        fetchVendors(search);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to save vendor");
      }
    } catch (err) {
      alert("Error saving vendor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (vendor: any) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || "",
      mobile: vendor.mobile || "",
      gstin: vendor.gstin || "",
      address: vendor.address || "",
      quarryLocation: vendor.quarryLocation || "",
      openingBalance: vendor.openingBalance || 0,
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v._id !== id));
        setConfirmDeleteId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete vendor");
        setConfirmDeleteId(null);
      }
    } catch (err) {
      alert("Error deleting vendor");
    }
  };

  // Aggregated stats
  const totalPurchasesAcrossVendors = useMemo(
    () => vendors.reduce((acc, v) => acc + (v.totalAmount || 0), 0),
    [vendors]
  );
  const totalPendingAcrossVendors = useMemo(
    () => vendors.reduce((acc, v) => acc + (v.totalPending || 0), 0),
    [vendors]
  );
  const totalInwardsCount = useMemo(
    () => vendors.reduce((acc, v) => acc + (v.totalPurchases || 0), 0),
    [vendors]
  );

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            <span>Vendors & Quarry Suppliers</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Vendor directories, stone supply records, and payment ledger accounts
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/purchases"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-700/80 text-xs transition-all"
          >
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Inward Purchases</span>
          </Link>

          <button
            onClick={() => {
              setEditingVendor(null);
              setFormData({
                name: "",
                mobile: "",
                gstin: "",
                address: "",
                quarryLocation: "",
                openingBalance: 0,
              });
              setShowAddModal(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 text-xs active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Vendor</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Vendors
            </span>
            <div className="text-xl sm:text-3xl font-black text-white">{vendors.length}</div>
            <div className="text-[10px] text-slate-500">{totalInwardsCount} loads received</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Purchases Cost
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              ₹{formatCurrency(totalPurchasesAcrossVendors)}
            </div>
            <div className="text-[10px] text-slate-500">Gross inward value</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Vendor Pending Due
            </span>
            <div className="text-lg sm:text-2xl font-black text-red-400">
              ₹{formatCurrency(totalPendingAcrossVendors)}
            </div>
            <div className="text-[10px] text-slate-500">Total payable to suppliers</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search vendor name, phone, quarry..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* MOBILE VIEW: Vendor Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium text-xs">
            Loading vendors directory...
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <p className="font-bold text-slate-300">No vendors registered yet.</p>
            <p className="text-[11px] text-slate-500">No vendors registered yet.</p>
          </div>
        ) : (
          vendors.map((v) => (
            <div
              key={v._id}
              className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 shadow-md"
            >
              {/* Vendor Title */}
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-2.5">
                <div>
                  <h3 className="font-black text-sm text-slate-100 uppercase">{v.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{v.quarryLocation || v.address || "Quarry Source"}</span>
                  </div>
                </div>

                <span className="px-2.5 py-1 bg-slate-800 text-amber-400 rounded-lg text-[10px] font-black shrink-0">
                  {v.totalPurchases || 0} Loads
                </span>
              </div>

              {/* Phone & Financial Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2 pt-0.5">
                  {v.mobile ? (
                    <a
                      href={`tel:${v.mobile}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call {v.mobile}</span>
                    </a>
                  ) : (
                    <span className="text-slate-500 text-xs">No phone</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Purchases:</span>
                  <span className="font-black text-slate-200">₹{formatCurrency(v.totalAmount || 0)}</span>
                </div>
              </div>

              {/* Balance Due Box */}
              <div className="flex justify-between items-center bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Pending Balance:</span>
                <span
                  className={`text-sm font-black ${
                    (v.totalPending || 0) > 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  ₹{formatCurrency(v.totalPending || 0)}
                </span>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <Link
                  href={`/vendors/${v._id}/statement`}
                  className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Statement</span>
                </Link>

                <button
                  onClick={() => handleEditClick(v)}
                  className="p-2.5 text-slate-400 hover:text-blue-400 bg-slate-800 rounded-xl"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {confirmDeleteId === v._id ? (
                  <div className="flex items-center gap-1 bg-red-950 border border-red-800 px-2 py-1.5 rounded-xl text-xs">
                    <span className="text-red-300 font-bold">Delete?</span>
                    <button
                      onClick={() => handleDelete(v._id)}
                      className="text-red-400 font-black underline px-1"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-slate-400 font-bold px-1"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(v._id)}
                    className="p-2.5 text-slate-400 hover:text-red-400 bg-slate-800 rounded-xl"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* DESKTOP VIEW: Table */}
      <div className="hidden md:block glass-card rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="p-3.5 pl-5">Vendor / Quarry Name</th>
                <th className="p-3.5">Contact Details</th>
                <th className="p-3.5">Quarry Pit / Source</th>
                <th className="p-3.5 text-center">Inward Loads</th>
                <th className="p-3.5 text-right">Total Purchased (₹)</th>
                <th className="p-3.5 text-right">Pending Balance (₹)</th>
                <th className="p-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500 font-medium">
                    Loading vendors directory...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-500">
                    <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-600 opacity-50" />
                    <p className="font-semibold">No vendors registered yet.</p>
                  </td>
                </tr>
              ) : (
                vendors.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-900/40 transition-colors group">
                    <td className="p-3.5 pl-5">
                      <Link
                        href={`/vendors/${v._id}/statement`}
                        className="font-bold text-slate-100 hover:text-amber-400 uppercase transition-colors block"
                      >
                        {v.name}
                      </Link>
                      {v.gstin && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          GST: {v.gstin}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{v.mobile || "N/A"}</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {v.quarryLocation || v.address || "Not specified"}
                        </span>
                      </div>
                    </td>

                    <td className="p-3.5 text-center">
                      <span className="px-2.5 py-1 bg-slate-800 rounded-lg font-bold text-slate-200">
                        {v.totalPurchases || 0} Loads
                      </span>
                    </td>

                    <td className="p-3.5 text-right font-bold text-slate-100">
                      ₹{formatCurrency(v.totalAmount || 0)}
                    </td>

                    <td className="p-3.5 text-right">
                      <span
                        className={`font-black ${
                          (v.totalPending || 0) > 0 ? "text-red-400" : "text-emerald-400"
                        }`}
                      >
                        ₹{formatCurrency(v.totalPending || 0)}
                      </span>
                    </td>

                    <td className="p-3.5 pr-5 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/vendors/${v._id}/statement`}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg inline-block transition-colors"
                        title="View Vendor Statement"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleEditClick(v)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit Vendor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === v._id ? (
                        <span className="inline-flex items-center space-x-1 bg-red-950/80 border border-red-800 px-2 py-1 rounded-lg text-[10px]">
                          <span className="text-red-300 font-bold">Delete?</span>
                          <button
                            onClick={() => handleDelete(v._id)}
                            className="text-red-400 hover:text-white font-black underline"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-slate-400 hover:text-white font-bold"
                          >
                            No
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(v._id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-400/35 backdrop-blur-[2px] p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-white font-black text-base sm:text-lg">
                <Building2 className="w-5 h-5 text-amber-400" />
                <span>{editingVendor ? "Edit Vendor" : "Register New Vendor"}</span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVendor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Vendor Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sri Murugan Blue Metals"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="Mobile number"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="GSTIN"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Quarry Pit Location / Source Mine
                </label>
                <input
                  type="text"
                  value={formData.quarryLocation}
                  onChange={(e) => setFormData({ ...formData, quarryLocation: e.target.value })}
                  placeholder="e.g. North Quarry Pit 2, Karur"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plant address"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-base sm:text-sm text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  {submitting ? "Saving..." : editingVendor ? "Update Vendor" : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
