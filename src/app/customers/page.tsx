"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Search, Plus, FileText, Phone, MapPin, Trash2, ExternalLink, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function CustomersListPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
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
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCustomers((prev) => prev.filter((c) => c._id !== id));
      } else {
        alert("Failed to delete customer");
      }
    } catch (err) {
      alert("Error deleting customer");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>Customer Management & Ledgers</span>
          </h1>
          <p className="text-sm text-slate-400">View stored customer accounts and generate customer ledger statements</p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by name, mobile, GSTIN, or delivery site..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-slate-400 hover:text-white px-3 py-2 bg-slate-800 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Customers Table / Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading stored customers...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 space-y-3">
            <Users className="w-10 h-10 mx-auto text-slate-600" />
            <p>No customers found.</p>
            <p className="text-xs text-slate-400">Customers are automatically added whenever you save a bill!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="p-3">Customer Name (A/c Name)</th>
                  <th className="p-3">Mobile No</th>
                  <th className="p-3">GSTIN / UIN</th>
                  <th className="p-3">Default Delivery Site</th>
                  <th className="p-3">Address</th>
                  <th className="p-3 text-right">Actions / Statement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-950/50 transition-colors">
                    <td className="p-3 font-bold text-amber-400 uppercase text-sm">
                      {cust.name}
                    </td>
                    <td className="p-3 text-slate-300">
                      {cust.mobile ? (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {cust.mobile}
                        </span>
                      ) : (
                        "--"
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-300">{cust.gstin || "--"}</td>
                    <td className="p-3 text-amber-300 font-semibold">{cust.deliveryPlace || "--"}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{cust.address || "--"}</td>
                    <td className="p-3 text-right space-x-2">
                      <Link
                        href={`/customers/${cust._id}/statement`}
                        className="inline-flex items-center p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all"
                        title="Click Eye Icon to View Customer Ledger Statement Sheet"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/customers/${cust._id}/statement`}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Statement</span>
                      </Link>
                      <button
                        onClick={() => handleDelete(cust._id)}
                        className="inline-flex items-center p-1.5 bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 rounded-lg border border-slate-700 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-white">Add New Customer Account</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Customer / A/c Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none uppercase"
                  placeholder="e.g. ROBERT MOBILE GARDEN"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mobile No</label>
                <input
                  type="text"
                  value={newCustomer.mobile}
                  onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Mobile"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">GSTIN / UIN</label>
                <input
                  type="text"
                  value={newCustomer.gstin}
                  onChange={(e) => setNewCustomer({ ...newCustomer, gstin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="GSTIN"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Default Delivery Site / Place</label>
                <input
                  type="text"
                  value={newCustomer.deliveryPlace}
                  onChange={(e) => setNewCustomer({ ...newCustomer, deliveryPlace: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="e.g. PARUTHIVILAI"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Billing Address</label>
                <input
                  type="text"
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                  placeholder="Address"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
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
