"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Search, Plus, FileText, Phone, MapPin, Trash2, Eye, X, AlertCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CustomersListPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    mobile: "",
    gstin: "",
    address: "",
    deliveryPlace: "",
    openingBalance: 0,
  });

  const fetchCustomers = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?query=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      if (res.ok) {
        setShowAddModal(false);
        setNewCustomer({ name: "", mobile: "", gstin: "", address: "", deliveryPlace: "", openingBalance: 0 });
        fetchCustomers(search);
      } else {
        alert("Failed to create customer");
      }
    } catch (err) {
      alert("Error creating customer");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c._id !== id));
        setConfirmDeleteId(null);
      } else {
        alert("Failed to delete customer");
      }
    } catch (err) {
      alert("Error deleting customer");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            <span>Customer Directory & Ledgers</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Customer directory, phone contact, and billing ledger reports
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs sm:text-sm active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Customer</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer name, phone, site..."
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

      {/* MOBILE VIEW: Visual Cards */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium text-xs">
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
            <p className="font-bold text-slate-300">No customers found.</p>
            <p className="text-[11px] text-slate-500">No customers registered yet.</p>
          </div>
        ) : (
          customers.map((cust) => (
            <div
              key={cust._id}
              className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 shadow-md"
            >
              <div className="flex justify-between items-start border-b border-slate-800/80 pb-2.5">
                <div>
                  <h3 className="font-black text-sm text-slate-100 uppercase">{cust.name}</h3>
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{cust.deliveryPlace || cust.address || "No site specified"}</span>
                  </div>
                </div>

                {cust.gstin && (
                  <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                    GST: {cust.gstin}
                  </span>
                )}
              </div>

              {cust.mobile && (
                <div className="pt-1">
                  <a
                    href={`tel:${cust.mobile}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call {cust.mobile}</span>
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                <Link
                  href={`/customers/${cust._id}/statement`}
                  className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ledger</span>
                </Link>

                <Link
                  href={`/reports/payments?customerName=${encodeURIComponent(cust.name)}`}
                  className="flex-1 flex items-center justify-center space-x-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs"
                >
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payments</span>
                </Link>

                {confirmDeleteId === cust._id ? (
                  <div className="flex items-center gap-1 bg-red-950 border border-red-800 px-2 py-1.5 rounded-xl text-xs">
                    <span className="text-red-300 font-bold">Delete?</span>
                    <button
                      onClick={() => handleDelete(cust._id)}
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
                    onClick={() => setConfirmDeleteId(cust._id)}
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
      <div className="hidden md:block glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400 font-semibold">Loading stored customer accounts...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
              <Users className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-400">No customer accounts found.</p>
            <p className="text-xs text-slate-500">Customers are automatically saved whenever you issue a bill!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-950/40">
                  <th className="p-3.5 rounded-l-xl">Customer Name (A/c Name)</th>
                  <th className="p-3.5">Mobile No.</th>
                  <th className="p-3.5">GSTIN / UIN</th>
                  <th className="p-3.5">Default Delivery Site</th>
                  <th className="p-3.5">Address</th>
                  <th className="p-3.5 text-right rounded-r-xl">Actions / Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="p-3.5 font-extrabold text-amber-400 uppercase text-sm">
                      {cust.name}
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">
                      {cust.mobile ? (
                        <a
                          href={`tel:${cust.mobile}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-amber-400 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          {cust.mobile}
                        </a>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">{cust.gstin || "--"}</td>
                    <td className="p-3.5 text-amber-300 font-bold">{cust.deliveryPlace || "--"}</td>
                    <td className="p-3.5 text-slate-400 truncate max-w-xs">{cust.address || "--"}</td>
                    <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                      <Link
                        href={`/customers/${cust._id}/statement`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                        title="View Customer Ledger Statement"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ledger Statement</span>
                      </Link>
                      <Link
                        href={`/reports/payments?customerName=${encodeURIComponent(cust.name)}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-sm"
                        title="View Customer Payments & Receipts"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Payments</span>
                      </Link>
                      {confirmDeleteId === cust._id ? (
                        <span className="inline-flex items-center space-x-1 bg-red-950/80 border border-red-800 px-2 py-1 rounded-lg text-[10px]">
                          <span className="text-red-300 font-bold">Delete?</span>
                          <button
                            onClick={() => handleDelete(cust._id)}
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
                          onClick={() => setConfirmDeleteId(cust._id)}
                          className="inline-flex items-center p-2 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-colors"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="glass-card rounded-3xl p-5 sm:p-6 max-w-md w-full border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Add Customer Account</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Customer / A/c Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="e.g. Sri Balaji Constructions"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mobile</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={newCustomer.mobile}
                    onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={newCustomer.gstin}
                    onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value.toUpperCase() })}
                    placeholder="GSTIN"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white uppercase focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Delivery Site / Location</label>
                <input
                  type="text"
                  value={newCustomer.deliveryPlace}
                  onChange={(e) => setNewCustomer({ ...newCustomer, deliveryPlace: e.target.value })}
                  placeholder="e.g. Karur Bypass Site"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Address"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
