"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Search,
  Eye,
  Printer,
  Trash2,
  FileText,
  Truck,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  DollarSign,
  Scale,
  Phone,
  MapPin,
  CreditCard,
  ChevronRight,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import DateRangeFilter, { DateRange, inDateRange } from "@/components/DateRangeFilter";

export default function BillsListPage() {
  const router = useRouter();
  const [allBills, setBills] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" });
  // Everything below (cards, tabs, table) works on the bills inside the chosen dates
  const bills = useMemo(() => inDateRange(allBills, dateRange, (b) => b.date), [allBills, dateRange]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "UNPAID" | "PARTIAL">("ALL");
  const [viewMode, setViewMode] = useState<"invoices" | "customers">("invoices");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Quick Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [selectedBillForPay, setSelectedBillForPay] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    referenceNo: "",
    notes: "",
  });

  const fetchBills = async (query = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bills?query=${encodeURIComponent(query)}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBills(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/bills/${id}`, { method: "DELETE" });
      if (res.ok) {
        setBills((prev) => prev.filter((b) => b._id !== id));
        setConfirmDeleteId(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to delete bill");
        setConfirmDeleteId(null);
      }
    } catch (err) {
      alert("Error deleting bill");
    } finally {
      setDeletingId(null);
    }
  };

  // Open Quick Payment Modal for a bill
  const openPaymentModal = (bill: any) => {
    const remaining = Math.max(0, (bill.grandTotal || 0) - (bill.paidAmount || 0));
    setSelectedBillForPay(bill);
    setPaymentForm({
      amount: remaining > 0 ? String(remaining) : String(bill.grandTotal || ""),
      paymentMode: "Cash",
      date: new Date().toISOString().split("T")[0],
      referenceNo: "",
      notes: `Payment for Bill #${bill.invoiceNo}`,
    });
    setPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPay) return;
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    setPaymentSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billId: selectedBillForPay._id,
          invoiceNo: selectedBillForPay.invoiceNo,
          customerName: selectedBillForPay.billedTo?.name || "Customer",
          amount: Number(paymentForm.amount),
          paymentMode: paymentForm.paymentMode,
          date: paymentForm.date,
          referenceNo: paymentForm.referenceNo,
          notes: paymentForm.notes,
        }),
      });

      if (res.ok) {
        setPaymentModalOpen(false);
        fetchBills(search);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Failed to record payment");
      }
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Filter bills based on selected tab
  const filteredBills = useMemo(() => {
    if (statusFilter === "ALL") return bills;
    return bills.filter((b) => (b.paymentStatus || "UNPAID") === statusFilter);
  }, [bills, statusFilter]);

  // Aggregate stats
  const totalBilledVal = useMemo(
    () => bills.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    [bills]
  );
  const totalTransportVal = useMemo(
    () => bills.reduce((sum, b) => sum + (b.lorryFreight || 0), 0),
    [bills]
  );
  const totalPaidVal = useMemo(
    () => bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0),
    [bills]
  );
  const totalBalanceDueVal = useMemo(
    () => bills.reduce((sum, b) => sum + Math.max(0, (b.grandTotal || 0) - (b.paidAmount || 0)), 0),
    [bills]
  );
  const unpaidCount = useMemo(
    () => bills.filter((b) => (b.paymentStatus || "UNPAID") === "UNPAID").length,
    [bills]
  );
  const partialCount = useMemo(
    () => bills.filter((b) => b.paymentStatus === "PARTIAL").length,
    [bills]
  );
  const paidCount = useMemo(
    () => bills.filter((b) => b.paymentStatus === "PAID").length,
    [bills]
  );

  // Group customer ledger summaries directly in Sales
  const customerSummaries = useMemo(() => {
    const map = new Map<string, {
      name: string;
      mobile: string;
      invoicesCount: number;
      totalBilled: number;
      totalPaid: number;
      totalTransport: number;
      balanceDue: number;
      latestDate: string;
      latestBill?: any;
    }>();

    bills.forEach((b) => {
      const name = b.billedTo?.name?.trim() || "Unknown";
      const key = name.toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          name,
          mobile: b.billedTo?.mobile || "",
          invoicesCount: 0,
          totalBilled: 0,
          totalPaid: 0,
          totalTransport: 0,
          balanceDue: b.customerBalanceTillDate ?? 0,
          latestDate: b.date || "",
          latestBill: b,
        });
      }
      const entry = map.get(key)!;
      if (!entry.mobile && b.billedTo?.mobile) entry.mobile = b.billedTo.mobile;
      entry.invoicesCount += 1;
      entry.totalBilled += b.grandTotal || 0;
      entry.totalPaid += b.paidAmount || 0;
      entry.totalTransport += b.lorryFreight || 0;
      if (b.customerBalanceTillDate !== undefined) {
        entry.balanceDue = b.customerBalanceTillDate;
      }
      if (b.date && b.date >= entry.latestDate) {
        entry.latestDate = b.date;
        entry.latestBill = b;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.balanceDue - a.balanceDue);
  }, [bills]);

  return (
    <div className="max-w-[1600px] mx-auto p-3 sm:p-6 lg:p-8 space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2 tracking-tight">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
            <span>Quarry Sales Bills & Invoices</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sales dispatches, separate transport charges, partial payments, and customer balance tracking till date
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/reports/payments"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all"
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            <span>Payment Reports</span>
          </Link>

          <Link
            href="/bills/new"
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs sm:text-sm active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Create New Bill</span>
          </Link>
        </div>
      </div>

      {/* Summary Metric Strip - 4 High-Visibility Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Billed */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Total Sales Billed
            </span>
            <div className="text-lg sm:text-2xl font-black text-white">
              ₹{formatCurrency(totalBilledVal)}
            </div>
            <div className="text-[10px] text-slate-400">{bills.length} total bills</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 2: Transport Charges (Shown Separately) */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider block">
              Transport Charges
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-300">
              ₹{formatCurrency(totalTransportVal)}
            </div>
            <div className="text-[10px] text-amber-400/80 font-medium">Lorry freight separated</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 3: Total Paid / Partial Received */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Paid Amount
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              ₹{formatCurrency(totalPaidVal)}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold">{paidCount} cleared • {partialCount} partial</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 4: Pending Balance Due */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Balance Due (Till Date)
            </span>
            <div className={`text-lg sm:text-2xl font-black ${totalBalanceDueVal > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ₹{formatCurrency(totalBalanceDueVal)}
            </div>
            <div className="text-[10px] text-red-400 font-semibold">{unpaidCount} unpaid • {partialCount} partial</div>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="space-y-3">
        {/* View Mode Toggle: All Invoices vs Customer Balances */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/80 p-2 sm:p-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setViewMode("invoices")}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                viewMode === "invoices"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Sales Invoices ({filteredBills.length})</span>
            </button>
            <button
              onClick={() => setViewMode("customers")}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                viewMode === "customers"
                  ? "bg-amber-500 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Customer Balances Till Date ({customerSummaries.length})</span>
            </button>
          </div>

          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, invoice #, vehicle, phone..."
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status Tabs (Active in Invoices view) */}
          {viewMode === "invoices" && (
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 overflow-x-auto touch-scroll">
              {(["ALL", "PAID", "PARTIAL", "UNPAID"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === tab
                      ? "bg-amber-500 text-slate-950 shadow-md font-black"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab === "ALL"
                    ? `All (${bills.length})`
                    : tab === "PAID"
                    ? `Paid (${paidCount})`
                    : tab === "PARTIAL"
                    ? `Partial (${partialCount})`
                    : `Unpaid (${unpaidCount})`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: SALES INVOICES LIST */}
      {viewMode === "invoices" && (
        <>
          {/* MOBILE VIEW: Visual High-Contrast Cards */}
          <div className="block lg:hidden space-y-3">
            {loading ? (
              <div className="text-center py-12 text-slate-500 font-medium text-xs">
                Loading bills...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800 p-6 space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
                <p className="font-bold text-slate-300">No matching bills found.</p>
                <p className="text-[11px] text-slate-500">Try changing your search query or filter.</p>
              </div>
            ) : (
              filteredBills.map((bill) => {
                const isPaid = bill.paymentStatus === "PAID";
                const isPartial = bill.paymentStatus === "PARTIAL";
                const grand = bill.grandTotal || 0;
                const paid = bill.paidAmount || 0;
                const dueOnBill = Math.max(0, grand - paid);
                const transportFee = bill.lorryFreight || 0;
                const customerTillDateDue = bill.customerBalanceTillDate ?? dueOnBill;

                return (
                  <div
                    key={bill._id}
                    className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3 shadow-lg"
                  >
                    {/* Top Row: Invoice # & Vehicle No */}
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400 block">
                          #{bill.invoiceNo}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {bill.date}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center justify-end">
                          <span className="vehicle-plate text-xs">
                            <Truck className="w-3.5 h-3.5 text-amber-400" />
                            {bill.vehicleNo || "--"}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-1">{bill.transport || "Direct Transport"}</span>
                      </div>
                    </div>

                    {/* Customer & Location */}
                    <div className="flex justify-between items-start text-xs border-b border-slate-800/50 pb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer:</span>
                        <div className="font-black text-white uppercase truncate flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{bill.billedTo?.name || "--"}</span>
                        </div>
                        {bill.billedTo?.mobile && (
                          <a
                            href={`tel:${bill.billedTo.mobile}`}
                            className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{bill.billedTo.mobile}</span>
                          </a>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Weight:</span>
                        <span className="font-bold text-slate-200">
                          {bill.totalQty ? `${Number(bill.totalQty).toFixed(2)} ${bill.totalQtyUnit || "Tonne"}` : "--"}
                        </span>
                        {bill.deliveryPlace && (
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">📍 {bill.deliveryPlace}</span>
                        )}
                      </div>
                    </div>

                    {/* Financial Matrix (Transport Charges, Total, Paid, Due) */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs">
                      <div>
                        <span className="text-[10px] text-amber-400 font-semibold block">Transport Charges:</span>
                        <span className="font-black text-amber-300">₹{formatCurrency(transportFee)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block">Total Amount:</span>
                        <span className="font-black text-white">₹{formatCurrency(grand)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 font-semibold block">Paid (Partial):</span>
                        <span className="font-black text-emerald-400">₹{formatCurrency(paid)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-red-400 font-semibold block">Bill Due:</span>
                        <span className={`font-black ${dueOnBill > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          ₹{formatCurrency(dueOnBill)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Balance Till Date Banner */}
                    <div className="flex justify-between items-center bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Customer Owed Till Date:</span>
                        <span className={`font-black ${customerTillDateDue > 0 ? "text-red-400" : "text-emerald-400"}`}>
                          ₹{formatCurrency(customerTillDateDue)}
                        </span>
                      </div>
                      <button
                        onClick={() => openPaymentModal(bill)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-sm active:scale-95 transition-all ${
                          isPaid
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : isPartial
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            : "bg-red-500/20 text-red-400 border-red-500/40"
                        }`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        <span>{bill.paymentStatus || "UNPAID"}</span>
                      </button>
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                      <Link
                        href={`/bills/${bill._id}`}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>View</span>
                      </Link>

                      <Link
                        href={`/bills/${bill._id}/print`}
                        className="flex-1 flex items-center justify-center space-x-1.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </Link>

                      <button
                        onClick={() => openPaymentModal(bill)}
                        className="flex-1 flex items-center justify-center space-x-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Pay</span>
                      </button>

                      {confirmDeleteId === bill._id ? (
                        <div className="flex items-center gap-1 bg-red-950 border border-red-800 px-2 py-1.5 rounded-xl text-xs">
                          <span className="text-red-300 font-bold">Delete?</span>
                          <button
                            onClick={() => handleDelete(bill._id)}
                            disabled={deletingId === bill._id}
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
                          onClick={() => setConfirmDeleteId(bill._id)}
                          className="p-2 text-slate-400 hover:text-red-400 bg-slate-800 rounded-xl"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* DESKTOP VIEW: Comprehensive Detailed Table */}
          <div className="hidden lg:block glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
            {loading ? (
              <div className="text-center py-16 text-slate-400 font-semibold">Loading quarry bills...</div>
            ) : filteredBills.length === 0 ? (
              <div className="text-center py-16 text-slate-500 space-y-3">
                <div className="w-14 h-14 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <FileText className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-slate-400">No matching bills found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-950/40">
                      <th className="p-3">Invoice #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer Details</th>
                      <th className="p-3">Vehicle & Transporter</th>
                      <th className="p-3 text-right text-amber-400">Transport Charges</th>
                      <th className="p-3 text-right">Total Amount</th>
                      <th className="p-3 text-right text-emerald-400">Paid (Partial)</th>
                      <th className="p-3 text-right text-red-400">Bill Due</th>
                      <th className="p-3 text-right">Customer Due (Till Date)</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredBills.map((bill) => {
                      const status = bill.paymentStatus || "UNPAID";
                      const grand = bill.grandTotal || 0;
                      const paid = bill.paidAmount || 0;
                      const dueOnBill = Math.max(0, grand - paid);
                      const transportFee = bill.lorryFreight || 0;
                      const customerTillDateDue = bill.customerBalanceTillDate ?? dueOnBill;

                      return (
                        <tr key={bill._id} className="hover:bg-slate-800/40 transition-colors group">
                          {/* Invoice # */}
                          <td className="p-3 font-extrabold text-amber-400 whitespace-nowrap">
                            <Link href={`/bills/${bill._id}`} className="hover:underline">
                              #{bill.invoiceNo}
                            </Link>
                          </td>

                          {/* Date */}
                          <td className="p-3 text-slate-300 font-medium whitespace-nowrap">
                            {formatDate(bill.date)}
                          </td>

                          {/* Customer Details */}
                          <td className="p-3">
                            <div className="font-extrabold text-white uppercase tracking-tight">
                              {bill.billedTo?.name || "--"}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              {bill.billedTo?.mobile && (
                                <a
                                  href={`tel:${bill.billedTo.mobile}`}
                                  className="text-emerald-400 hover:underline flex items-center gap-0.5"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  <span>{bill.billedTo.mobile}</span>
                                </a>
                              )}
                              {bill.deliveryPlace && (
                                <span className="truncate max-w-[120px] text-slate-400">
                                  📍 {bill.deliveryPlace}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Vehicle No & Transporter */}
                          <td className="p-3">
                            <div>
                              <span className="vehicle-plate text-[10px]">
                                {bill.vehicleNo || "--"}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                              {bill.transport || "Direct Transport"}
                            </div>
                          </td>

                          {/* Transport Charges (Thaniya Show Ahanum) */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="font-black text-amber-300 text-xs">
                              ₹{formatCurrency(transportFee)}
                            </div>
                            {bill.loadingCharges > 0 && (
                              <div className="text-[9px] text-slate-400">
                                +₹{formatCurrency(bill.loadingCharges)} load
                              </div>
                            )}
                          </td>

                          {/* Total Amount */}
                          <td className="p-3 text-right font-black text-white text-sm whitespace-nowrap">
                            ₹{formatCurrency(grand)}
                          </td>

                          {/* Paid Amount (Partial) */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <span className={`font-bold ${paid > 0 ? "text-emerald-400" : "text-slate-500"}`}>
                              ₹{formatCurrency(paid)}
                            </span>
                          </td>

                          {/* Bill Due */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <span className={`font-black ${dueOnBill > 0 ? "text-red-400" : "text-emerald-400"}`}>
                              ₹{formatCurrency(dueOnBill)}
                            </span>
                          </td>

                          {/* Customer Balance Till Date */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black inline-block ${
                                customerTillDateDue > 0
                                  ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              }`}
                              title="Total cumulative pending balance across all bills for this customer till date"
                            >
                              ₹{formatCurrency(customerTillDateDue)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => openPaymentModal(bill)}
                              title="Click to record payment installment"
                              className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                                status === "PAID"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35 hover:bg-emerald-500/25"
                                  : status === "PARTIAL"
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/35 hover:bg-amber-500/25"
                                  : "bg-red-500/15 text-red-400 border-red-500/35 hover:bg-red-500/25"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  status === "PAID" ? "bg-emerald-400" : status === "PARTIAL" ? "bg-amber-400" : "bg-red-400"
                                }`}
                              />
                              <span>{status}</span>
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => openPaymentModal(bill)}
                              className="inline-flex items-center p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 transition-colors"
                              title="Record Payment Installment"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                            </button>
                            <Link
                              href={`/bills/${bill._id}`}
                              className="inline-flex items-center p-2 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-xl border border-slate-700 transition-colors"
                              title="View Bill Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/bills/${bill._id}/print`}
                              className="inline-flex items-center p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 transition-colors"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Link>
                            {confirmDeleteId === bill._id ? (
                              <span className="inline-flex items-center space-x-1 bg-red-950/80 border border-red-800 px-2 py-1 rounded-lg text-[10px]">
                                <span className="text-red-300 font-bold">Delete?</span>
                                <button
                                  onClick={() => handleDelete(bill._id)}
                                  disabled={deletingId === bill._id}
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
                                onClick={() => setConfirmDeleteId(bill._id)}
                                className="inline-flex items-center p-2 bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-xl border border-slate-700 transition-colors"
                                title="Delete Bill"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Totals Summary Footer */}
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 font-extrabold bg-slate-900/60 text-xs">
                      <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-slate-300">
                        Total ({filteredBills.length} Bills):
                      </td>
                      <td className="p-3 text-right font-black text-amber-300">
                        ₹{formatCurrency(filteredBills.reduce((s, b) => s + (b.lorryFreight || 0), 0))}
                      </td>
                      <td className="p-3 text-right font-black text-white text-sm">
                        ₹{formatCurrency(filteredBills.reduce((s, b) => s + (b.grandTotal || 0), 0))}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-400">
                        ₹{formatCurrency(filteredBills.reduce((s, b) => s + (b.paidAmount || 0), 0))}
                      </td>
                      <td className="p-3 text-right font-black text-red-400">
                        ₹{formatCurrency(filteredBills.reduce((s, b) => s + Math.max(0, (b.grandTotal || 0) - (b.paidAmount || 0)), 0))}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: CUSTOMER BALANCES TILL DATE (Sales la ye Customer Details) */}
      {viewMode === "customers" && (
        <div className="glass-card rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Customer Ledger Accounts & Balances Till Date</span>
              </h2>
              <p className="text-xs text-slate-400">
                Track for each customer: total sales amount, partial payments received, and exact balance owed till date
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 font-medium">Loading customer balances...</div>
          ) : customerSummaries.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No customer records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[11px] bg-slate-950/40">
                    <th className="p-3.5">Customer Name & Contact</th>
                    <th className="p-3.5 text-center">Invoices</th>
                    <th className="p-3.5 text-right text-amber-400">Transport Charges</th>
                    <th className="p-3.5 text-right">Total Amount Billed</th>
                    <th className="p-3.5 text-right text-emerald-400">Amount Paid</th>
                    <th className="p-3.5 text-right text-red-400 font-black">Balance Due Till Date</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {customerSummaries.map((c, idx) => {
                    const isFullyPaid = c.balanceDue <= 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5">
                          <div className="font-extrabold uppercase text-white text-sm tracking-tight">
                            {c.name}
                          </div>
                          {c.mobile && (
                            <a
                              href={`tel:${c.mobile}`}
                              className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{c.mobile}</span>
                            </a>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-300">
                          {c.invoicesCount}
                        </td>
                        <td className="p-3.5 text-right font-black text-amber-300">
                          ₹{formatCurrency(c.totalTransport)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-white text-sm">
                          ₹{formatCurrency(c.totalBilled)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-400">
                          ₹{formatCurrency(c.totalPaid)}
                        </td>
                        <td className={`p-3.5 text-right font-black text-base ${isFullyPaid ? "text-emerald-400" : "text-red-400"}`}>
                          ₹{formatCurrency(c.balanceDue)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                              isFullyPaid
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
                                : "bg-red-500/15 text-red-400 border-red-500/35"
                            }`}
                          >
                            {isFullyPaid ? "🟢 CLEARED" : "🔴 PENDING"}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                          {c.latestBill && (
                            <button
                              onClick={() => openPaymentModal(c.latestBill)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 inline-flex items-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Record Payment</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSearch(c.name);
                              setViewMode("invoices");
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs transition-all inline-flex items-center gap-1"
                            title="Filter invoices for this customer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Invoices</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-700 font-extrabold bg-slate-900/60 text-xs">
                    <td className="p-3.5 uppercase tracking-wider text-slate-300">Grand Total:</td>
                    <td className="p-3.5 text-center">
                      {customerSummaries.reduce((s, c) => s + c.invoicesCount, 0)}
                    </td>
                    <td className="p-3.5 text-right font-black text-amber-300">
                      ₹{formatCurrency(customerSummaries.reduce((s, c) => s + c.totalTransport, 0))}
                    </td>
                    <td className="p-3.5 text-right font-black text-white text-sm">
                      ₹{formatCurrency(customerSummaries.reduce((s, c) => s + c.totalBilled, 0))}
                    </td>
                    <td className="p-3.5 text-right font-black text-emerald-400">
                      ₹{formatCurrency(customerSummaries.reduce((s, c) => s + c.totalPaid, 0))}
                    </td>
                    <td className="p-3.5 text-right font-black text-red-400 text-base">
                      ₹{formatCurrency(customerSummaries.reduce((s, c) => s + c.balanceDue, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QUICK RECORD PAYMENT MODAL */}
      {paymentModalOpen && selectedBillForPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-2xl relative">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                <CreditCard className="w-4 h-4" />
                <span>Record Customer Payment Receipt</span>
              </div>
              <h3 className="text-lg font-black text-white">
                Invoice #{selectedBillForPay.invoiceNo} • <span className="uppercase text-amber-300">{selectedBillForPay.billedTo?.name}</span>
              </h3>
            </div>

            {/* Bill Info Strip */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Total Bill:</span>
                <span className="font-bold text-white">₹{formatCurrency(selectedBillForPay.grandTotal)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-medium">Already Paid:</span>
                <span className="font-bold text-emerald-400">₹{formatCurrency(selectedBillForPay.paidAmount || 0)}</span>
              </div>
              <div>
                <span className="text-[10px] text-red-400 block font-medium">Balance Due:</span>
                <span className="font-bold text-red-400">
                  ₹{formatCurrency(Math.max(0, (selectedBillForPay.grandTotal || 0) - (selectedBillForPay.paidAmount || 0)))}
                </span>
              </div>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Amount to Pay (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl pl-8 pr-3 py-2.5 text-white font-black text-sm focus:outline-none"
                    placeholder="Enter payment amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2.5 text-white font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Reference / UTR / Cheque #</label>
                <input
                  type="text"
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  placeholder="e.g. UPI Ref / Bank UTR # / Cheque 481029"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Optional payment notes"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {paymentSubmitting ? "Recording..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
