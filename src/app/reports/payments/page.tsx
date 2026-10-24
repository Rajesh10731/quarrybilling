"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  Calendar,
  Search,
  Printer,
  PlusCircle,
  FileText,
  Users,
  Filter,
  ArrowUpDown,
  Trash2,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  RefreshCw,
  ExternalLink,
  Truck,
  Phone,
  MapPin,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function CustomerPaymentReportPage() {
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"customers" | "sales" | "transactions">("customers");

  // Filters
  const [fromDate, setFromDate] = useState(() => {
    // Current Indian fiscal year (start Apr 1)
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return `${startYear}-04-01`;
  });
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [customerBills, setCustomerBills] = useState<any[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);

  // Form State for new payment
  const [paymentForm, setPaymentForm] = useState({
    customerName: "",
    customerId: "",
    billId: "",
    invoiceNo: "",
    amount: "",
    paymentMode: "Cash",
    date: new Date().toISOString().split("T")[0],
    referenceNo: "",
    notes: "",
  });

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);
      if (selectedCustomer) params.append("customerName", selectedCustomer);
      if (searchQuery) params.append("query", searchQuery);

      const res = await fetch(`/api/reports/payments?${params.toString()}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch payment report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [fromDate, toDate, selectedCustomer]);

  // Handle Quick Date Presets
  const setDatePreset = (preset: "today" | "this_month" | "fy" | "all") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (preset === "today") {
      setFromDate(todayStr);
      setToDate(todayStr);
    } else if (preset === "this_month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (preset === "fy") {
      const now = new Date();
      const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setFromDate(`${startYear}-04-01`);
      setToDate(`${startYear + 1}-03-31`);
    } else if (preset === "all") {
      setFromDate("");
      setToDate("");
    }
  };

  // Load pending bills when customer is selected in payment modal
  const handleCustomerChangeInModal = async (custName: string) => {
    setPaymentForm((prev) => ({
      ...prev,
      customerName: custName,
      billId: "",
      invoiceNo: "",
      amount: "",
    }));

    if (!custName) {
      setCustomerBills([]);
      return;
    }

    setLoadingBills(true);
    try {
      const res = await fetch(`/api/bills?query=${encodeURIComponent(custName)}`);
      const bills = await res.json();
      if (Array.isArray(bills)) {
        setCustomerBills(bills);
      }
    } catch (err) {
      console.error("Error loading bills for customer", err);
    } finally {
      setLoadingBills(false);
    }
  };

  // When a bill is selected, suggest remaining balance
  const handleBillSelect = (billId: string) => {
    const bill = customerBills.find((b) => b._id === billId);
    if (bill) {
      const grandTotal = bill.grandTotal || 0;
      const alreadyPaid = bill.paidAmount || 0;
      const remaining = Math.max(0, grandTotal - alreadyPaid);
      setPaymentForm((prev) => ({
        ...prev,
        billId: bill._id,
        invoiceNo: bill.invoiceNo,
        amount: remaining > 0 ? String(remaining) : String(grandTotal),
      }));
    } else {
      setPaymentForm((prev) => ({
        ...prev,
        billId: "",
        invoiceNo: "",
      }));
    }
  };

  // Submit Payment
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.customerName || !paymentForm.amount || Number(paymentForm.amount) <= 0) {
      alert("Please enter customer name and valid payment amount.");
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentForm),
      });

      if (res.ok) {
        setShowPaymentModal(false);
        setPaymentForm({
          customerName: "",
          customerId: "",
          billId: "",
          invoiceNo: "",
          amount: "",
          paymentMode: "Cash",
          date: new Date().toISOString().split("T")[0],
          referenceNo: "",
          notes: "",
        });
        fetchReport();
      } else {
        const error = await res.json();
        alert(error.message || "Failed to record payment");
      }
    } catch (err) {
      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Delete Payment
  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment record? This will adjust the bill status.")) {
      return;
    }

    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchReport();
      } else {
        alert("Failed to delete payment");
      }
    } catch (err) {
      alert("Error deleting payment");
    }
  };

  // Print Report / Save PDF
  const handlePrint = () => {
    window.print();
  };

  const payments = reportData?.payments || [];
  const customerSummaries = reportData?.customerSummaries || [];
  const reportBills = reportData?.bills || [];
  const kpi = reportData?.kpi || {
    totalCollected: 0,
    totalBilled: 0,
    totalOutstanding: 0,
    totalTransportCharges: 0,
    totalLoadingCharges: 0,
    transactionCount: 0,
    billsCount: 0,
  };
  const company = reportData?.company || {};
  const customersList = reportData?.customers || [];

  // Filter payments by search query on client
  const filteredPayments = useMemo(() => {
    if (!searchQuery) return payments;
    const q = searchQuery.toLowerCase();
    return payments.filter(
      (p: any) =>
        p.customerName?.toLowerCase().includes(q) ||
        p.invoiceNo?.toLowerCase().includes(q) ||
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.referenceNo?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  // Filter customer summaries by search query on client
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customerSummaries;
    const q = searchQuery.toLowerCase();
    return customerSummaries.filter(
      (c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q)
    );
  }, [customerSummaries, searchQuery]);

  // Filter bills by search query on client
  const filteredBills = useMemo(() => {
    if (!searchQuery) return reportBills;
    const q = searchQuery.toLowerCase();
    return reportBills.filter(
      (b: any) =>
        b.customerName?.toLowerCase().includes(q) ||
        b.invoiceNo?.toLowerCase().includes(q) ||
        b.vehicleNo?.toLowerCase().includes(q) ||
        b.transport?.toLowerCase().includes(q) ||
        b.customerMobile?.toLowerCase().includes(q)
    );
  }, [reportBills, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:bg-white print:text-black">
      {/* Top Controls Header (Hidden in Print) */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold mb-2">
            <IndianRupee className="w-3.5 h-3.5" />
            <span>Customer Payments &amp; Collection Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <span>Customer Sales &amp; Payment Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Track customer sales, separate transport charges, partial payments received, and cumulative balance owed till date
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => {
              setPaymentForm({
                customerName: selectedCustomer || "",
                customerId: "",
                billId: "",
                invoiceNo: "",
                amount: "",
                paymentMode: "Cash",
                date: new Date().toISOString().split("T")[0],
                referenceNo: "",
                notes: "",
              });
              if (selectedCustomer) {
                handleCustomerChangeInModal(selectedCustomer);
              }
              setShowPaymentModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/25 transition-all text-xs active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-bold rounded-xl shadow-md transition-all text-xs active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>

      {/* Printable Letterhead Header (Visible ONLY when Printing / PDF Export) */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-4 font-sans">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-wide uppercase text-black">
              {company.companyName || "QUARRY ENTERPRISES"}
            </h1>
            <p className="text-xs text-gray-700">{company.companyAddress || "Crusher & Quarry Site Operations"}</p>
            <p className="text-xs text-gray-700">
              {company.companyMobile && <span>Phone: {company.companyMobile} | </span>}
              {company.companyGstin && <span>GSTIN: {company.companyGstin}</span>}
            </p>
          </div>
          <div className="text-right border-l-2 border-black pl-4">
            <h2 className="text-base font-extrabold uppercase text-black">Sales &amp; Customer Ledger Report</h2>
            <p className="text-xs font-mono">Date: {new Date().toLocaleDateString("en-IN")}</p>
            <p className="text-xs font-semibold">
              Period: {fromDate || "Beginning"} to {toDate || "Present"}
            </p>
            {selectedCustomer && (
              <p className="text-xs font-bold text-black uppercase">
                Customer: {selectedCustomer}
              </p>
            )}
          </div>
        </div>

        {/* Print Summary Strip */}
        <div className="grid grid-cols-4 gap-2 border border-black p-2 mt-3 text-xs bg-gray-50">
          <div>
            <span className="font-bold block text-[10px] uppercase">Total Invoiced:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalBilled)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Transport Charges:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalTransportCharges)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Total Collected:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalCollected)}</span>
          </div>
          <div>
            <span className="font-bold block text-[10px] uppercase">Balance Outstanding:</span>
            <span className="font-extrabold">₹{formatCurrency(kpi.totalOutstanding)}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip (Hidden in Print) - 4 Rich Cards with Transport Charges Shown Separately */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 print:hidden">
        {/* Card 1: Total Invoiced Sales */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Invoiced Sales
            </span>
            <div className="text-lg sm:text-2xl font-black text-white">
              ₹{formatCurrency(kpi.totalBilled)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-medium">
              {kpi.billsCount || reportBills.length} Invoices Billed
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 2: Transport Charges (Thaniya Show Ahanum) */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Transport Charges
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-300">
              ₹{formatCurrency(kpi.totalTransportCharges || 0)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-amber-400/80 font-medium truncate">
              Lorry Freight Separated
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 3: Total Collected / Paid */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Received (Paid)
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-400">
              ₹{formatCurrency(kpi.totalCollected)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold truncate">
              {filteredPayments.length} Payment Receipts
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        {/* Card 4: Total Outstanding Balance Due Till Date */}
        <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Balance Due (Till Date)
            </span>
            <div className={`text-lg sm:text-2xl font-black ${kpi.totalOutstanding > 0 ? "text-red-400" : "text-emerald-400"}`}>
              ₹{formatCurrency(kpi.totalOutstanding)}
            </div>
            <div className="text-[9px] sm:text-[10px] text-red-400 font-semibold truncate">
              Receivables Outstanding
            </div>
          </div>
          <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Presets Bar (Hidden in Print) */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-slate-800 flex flex-col md:flex-row gap-3 sm:gap-4 items-stretch md:items-center justify-between print:hidden">
        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 border border-slate-800 p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs w-full sm:w-auto">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
              <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none text-xs py-1.5"
              />
            </div>
            <span className="text-slate-500 font-bold">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none text-xs py-1.5 flex-1 sm:flex-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto touch-scroll w-full sm:w-auto py-0.5">
            <button
              onClick={() => setDatePreset("today")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all shrink-0"
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset("this_month")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all shrink-0"
            >
              This Month
            </button>
            <button
              onClick={() => setDatePreset("fy")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 transition-all shrink-0"
            >
              FY 2026-27
            </button>
            <button
              onClick={() => setDatePreset("all")}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800 transition-all shrink-0"
            >
              All Time
            </button>
          </div>
        </div>

        {/* Customer Selector & Search Query */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Customer Dropdown */}
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none uppercase font-semibold"
          >
            <option value="">All Customers</option>
            {customersList.map((c: any) => (
              <option key={c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, invoice, vehicle..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-2 text-xs text-white focus:border-amber-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            onClick={fetchReport}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs Navigation (Hidden in Print) - 3 Dedicated Sections */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 print:hidden overflow-x-auto touch-scroll">
        <button
          onClick={() => setActiveTab("customers")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === "customers"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Customer Balances Till Date ({filteredCustomers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sales")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === "sales"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Sales Bills &amp; Due Audit ({filteredBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            activeTab === "transactions"
              ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-900"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Receipts History ({filteredPayments.length})</span>
        </button>
      </div>

      {/* TAB 1: CUSTOMER BALANCES TILL DATE (Full Customer-Wise Ledger & Due Tracker) */}
      {activeTab === "customers" && (
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center print:hidden">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Customer Ledger Accounts &amp; Outstanding Balances Till Date</span>
              </h2>
              <p className="text-xs text-slate-400">
                Track each client's total billed sales, transport charges, partial amounts paid, and remaining balance due till date
              </p>
            </div>
            <div className="text-xs font-bold text-slate-400">
              Showing <span className="text-amber-400">{filteredCustomers.length}</span> customer accounts
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 font-medium">Loading customer accounts...</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No customer ledger records available.</div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse print:text-black">
                  <thead>
                    <tr className="border-b border-slate-800 print:border-black text-slate-400 print:text-black font-bold uppercase tracking-wider text-[11px] bg-slate-950/40 print:bg-gray-100">
                      <th className="p-3 print:p-1.5">Customer Name &amp; Contact</th>
                      <th className="p-3 print:p-1.5 text-center">Invoices</th>
                      <th className="p-3 print:p-1.5 text-right text-amber-400 print:text-black">Transport Charges</th>
                      <th className="p-3 print:p-1.5 text-right">Total Amount Billed</th>
                      <th className="p-3 print:p-1.5 text-right text-emerald-400 print:text-black">Amount Paid</th>
                      <th className="p-3 print:p-1.5 text-right font-black text-red-400 print:text-black">Balance Due (Till Date)</th>
                      <th className="p-3 print:p-1.5 text-center">Status</th>
                      <th className="p-3 print:p-1.5 text-right print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 print:divide-gray-300">
                    {filteredCustomers.map((c: any, idx: number) => {
                      const isFullyPaid = c.balanceDue <= 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-800/40 print:hover:bg-transparent transition-colors">
                          <td className="p-3 print:p-1.5">
                            <div className="font-extrabold uppercase text-amber-400 print:text-black text-sm">
                              {c.name}
                            </div>
                            {c.mobile && (
                              <a
                                href={`tel:${c.mobile}`}
                                className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5 print:text-black"
                              >
                                <Phone className="w-2.5 h-2.5" />
                                <span>{c.mobile}</span>
                              </a>
                            )}
                          </td>
                          <td className="p-3 print:p-1.5 text-center font-bold text-slate-300 print:text-black">
                            {c.billsCount}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black">
                            ₹{formatCurrency(c.totalTransportCharges || 0)}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-bold text-white print:text-black">
                            ₹{formatCurrency(c.totalBilled)}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-bold text-emerald-400 print:text-black">
                            ₹{formatCurrency(c.totalPaid)}
                          </td>
                          <td className={`p-3 print:p-1.5 text-right font-black text-sm ${isFullyPaid ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"}`}>
                            ₹{formatCurrency(c.balanceDue)}
                          </td>
                          <td className="p-3 print:p-1.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                isFullyPaid
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-red-500/10 text-red-400 border-red-500/30"
                              }`}
                            >
                              {isFullyPaid ? "🟢 CLEAR" : "🔴 PENDING"}
                            </span>
                          </td>
                          <td className="p-3 print:p-1.5 text-right space-x-2 print:hidden whitespace-nowrap">
                            <button
                              disabled={isFullyPaid}
                              onClick={() => {
                                handleCustomerChangeInModal(c.name);
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                            >
                              + Pay
                            </button>
                            <button
                              onClick={() => {
                                setSelectedCustomer(c.name);
                                setActiveTab("sales");
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs transition-all"
                            >
                              Invoices
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 print:border-black font-extrabold bg-slate-900/60 print:bg-gray-100">
                      <td className="p-3 print:p-1.5 uppercase text-slate-300 print:text-black">Grand Total:</td>
                      <td className="p-3 print:p-1.5 text-center">
                        {filteredCustomers.reduce((s: number, c: any) => s + (c.billsCount || 0), 0)}
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black">
                        ₹{formatCurrency(filteredCustomers.reduce((s: number, c: any) => s + (c.totalTransportCharges || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right text-white print:text-black">
                        ₹{formatCurrency(filteredCustomers.reduce((s: number, c: any) => s + (c.totalBilled || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right text-emerald-400 print:text-black">
                        ₹{formatCurrency(filteredCustomers.reduce((s: number, c: any) => s + (c.totalPaid || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right text-red-400 print:text-black text-sm">
                        ₹{formatCurrency(filteredCustomers.reduce((s: number, c: any) => s + (c.balanceDue || 0), 0))}
                      </td>
                      <td colSpan={2} className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View for Customer Receivables */}
              <div className="block sm:hidden space-y-3 print:hidden">
                {filteredCustomers.map((c: any, idx: number) => {
                  const isFullyPaid = c.balanceDue <= 0;
                  return (
                    <div
                      key={idx}
                      className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-3 shadow-md"
                    >
                      <div className="flex justify-between items-start border-b border-slate-800/80 pb-2">
                        <div>
                          <h3 className="font-black text-sm text-white uppercase">{c.name}</h3>
                          {c.mobile && (
                            <a
                              href={`tel:${c.mobile}`}
                              className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>{c.mobile}</span>
                            </a>
                          )}
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {c.billsCount} Invoices
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            isFullyPaid
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-red-500/20 text-red-400 border-red-500/40"
                          }`}
                        >
                          {isFullyPaid ? "🟢 CLEAR" : "🔴 PENDING"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-amber-400 uppercase font-bold block">Transport Charges:</span>
                          <span className="font-bold text-amber-300">₹{formatCurrency(c.totalTransportCharges || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Billed:</span>
                          <span className="font-bold text-slate-200">₹{formatCurrency(c.totalBilled)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Amount Paid:</span>
                          <span className="font-bold text-emerald-400">₹{formatCurrency(c.totalPaid)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-red-400 uppercase font-bold block">Balance Due:</span>
                          <span className={`font-black ${isFullyPaid ? "text-emerald-400" : "text-red-400"}`}>
                            ₹{formatCurrency(c.balanceDue)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                        <button
                          disabled={isFullyPaid}
                          onClick={() => {
                            handleCustomerChangeInModal(c.name);
                            setShowPaymentModal(true);
                          }}
                          className="disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>+ Record Payment</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: SALES BILLS & DUE AUDIT (Invoice-by-Invoice Detailed Tracker) */}
      {activeTab === "sales" && (
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center print:hidden">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Sales Bills Audit: Transport Charges, Paid &amp; Due Till Date</span>
              </h2>
              <p className="text-xs text-slate-400">
                Detailed audit of every quarry sales bill with separated transport fees, partial payments, and customer balance till date
              </p>
            </div>
            <div className="text-xs font-bold text-slate-400">
              Showing <span className="text-amber-400">{filteredBills.length}</span> sales bills
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 font-medium">Loading sales records...</div>
          ) : filteredBills.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-sm font-semibold text-slate-400">No matching sales bills found.</p>
            </div>
          ) : (
            <>
              {/* Desktop View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse print:text-black">
                  <thead>
                    <tr className="border-b border-slate-800 print:border-black text-slate-400 print:text-black font-bold uppercase tracking-wider text-[11px] bg-slate-950/40 print:bg-gray-100">
                      <th className="p-3 print:p-1.5">Invoice #</th>
                      <th className="p-3 print:p-1.5">Date</th>
                      <th className="p-3 print:p-1.5">Customer Details</th>
                      <th className="p-3 print:p-1.5">Vehicle &amp; Transport</th>
                      <th className="p-3 print:p-1.5 text-right text-amber-400 print:text-black">Transport Charges</th>
                      <th className="p-3 print:p-1.5 text-right">Total Amount</th>
                      <th className="p-3 print:p-1.5 text-right text-emerald-400 print:text-black">Paid</th>
                      <th className="p-3 print:p-1.5 text-right text-red-400 print:text-black">Bill Due</th>
                      <th className="p-3 print:p-1.5 text-center">Status</th>
                      <th className="p-3 print:p-1.5 text-right print:hidden">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 print:divide-gray-300">
                    {filteredBills.map((b: any) => {
                      const status = b.paymentStatus || "UNPAID";
                      return (
                        <tr key={b._id} className="hover:bg-slate-800/40 print:hover:bg-transparent transition-colors">
                          <td className="p-3 print:p-1.5 font-extrabold text-amber-400 print:text-black whitespace-nowrap">
                            <Link href={`/bills/${b._id}`} className="hover:underline flex items-center gap-1">
                              <span>#{b.invoiceNo}</span>
                              <ExternalLink className="w-2.5 h-2.5 print:hidden" />
                            </Link>
                          </td>
                          <td className="p-3 print:p-1.5 text-slate-300 print:text-black whitespace-nowrap">
                            {formatDate(b.date)}
                          </td>
                          <td className="p-3 print:p-1.5">
                            <div className="font-extrabold uppercase text-white print:text-black">
                              {b.customerName}
                            </div>
                            {b.customerMobile && (
                              <div className="text-[10px] text-emerald-400 print:text-black font-semibold">
                                📞 {b.customerMobile}
                              </div>
                            )}
                          </td>
                          <td className="p-3 print:p-1.5">
                            <div className="font-mono text-slate-200 print:text-black text-[11px] font-bold">
                              {b.vehicleNo || "--"}
                            </div>
                            <div className="text-[10px] text-slate-400 print:text-gray-600 truncate max-w-[120px]">
                              {b.transport || "Direct"}
                            </div>
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black whitespace-nowrap">
                            ₹{formatCurrency(b.transportCharges)}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-black text-white print:text-black whitespace-nowrap">
                            ₹{formatCurrency(b.grandTotal)}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-bold text-emerald-400 print:text-black whitespace-nowrap">
                            ₹{formatCurrency(b.paidAmount)}
                          </td>
                          <td className="p-3 print:p-1.5 text-right font-black text-red-400 print:text-black whitespace-nowrap">
                            ₹{formatCurrency(b.balanceDue)}
                          </td>
                          <td className="p-3 print:p-1.5 text-center whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                status === "PAID"
                                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 print:text-black"
                                  : status === "PARTIAL"
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 print:text-black"
                                  : "bg-red-500/15 text-red-400 border-red-500/30 print:text-black"
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                          <td className="p-3 print:p-1.5 text-right print:hidden space-x-1.5 whitespace-nowrap">
                            <button
                              disabled={(b.balanceDue || 0) <= 0}
                              onClick={() => {
                                handleCustomerChangeInModal(b.customerName);
                                handleBillSelect(b._id);
                                setShowPaymentModal(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                            >
                              + Pay
                            </button>
                            <Link
                              href={`/bills/${b._id}/print`}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs border border-slate-700 transition-all inline-block"
                            >
                              Print
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 print:border-black font-extrabold bg-slate-900/60 print:bg-gray-100">
                      <td colSpan={4} className="p-3 print:p-1.5 uppercase text-slate-300 print:text-black text-right">
                        Totals ({filteredBills.length} Bills):
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-amber-300 print:text-black">
                        ₹{formatCurrency(filteredBills.reduce((s: number, b: any) => s + (b.transportCharges || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-white print:text-black">
                        ₹{formatCurrency(filteredBills.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-emerald-400 print:text-black">
                        ₹{formatCurrency(filteredBills.reduce((s: number, b: any) => s + (b.paidAmount || 0), 0))}
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-red-400 print:text-black">
                        ₹{formatCurrency(filteredBills.reduce((s: number, b: any) => s + (b.balanceDue || 0), 0))}
                      </td>
                      <td colSpan={3} className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile View */}
              <div className="block sm:hidden space-y-3 print:hidden">
                {filteredBills.map((b: any) => (
                  <div
                    key={b._id}
                    className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2.5 shadow-md text-xs"
                  >
                    <div className="flex justify-between items-start border-b border-slate-800/80 pb-2">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400">#{b.invoiceNo}</span>
                        <span className="text-[10px] text-slate-400 block">{formatDate(b.date)}</span>
                      </div>
                      <span className="vehicle-plate text-[10px]">{b.vehicleNo || "--"}</span>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer:</span>
                        <span className="font-black text-white uppercase">{b.customerName}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-amber-400 uppercase font-bold block">Transport:</span>
                        <span className="font-bold text-amber-300">₹{formatCurrency(b.transportCharges)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                      <div>
                        <span className="text-[9px] text-slate-400 block">Total:</span>
                        <span className="font-bold text-white">₹{formatCurrency(b.grandTotal)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-emerald-400 block">Paid:</span>
                        <span className="font-bold text-emerald-400">₹{formatCurrency(b.paidAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-red-400 block">Due:</span>
                        <span className="font-bold text-red-400">₹{formatCurrency(b.balanceDue)}</span>
                      </div>
                    </div>

                    <div className="flex justify-end items-center pt-1 border-t border-slate-800/60">
                      <button
                        disabled={(b.balanceDue || 0) <= 0}
                        onClick={() => {
                          handleCustomerChangeInModal(b.customerName);
                          handleBillSelect(b._id);
                          setShowPaymentModal(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg text-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none"
                      >
                        + Pay
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENT RECEIPTS HISTORY */}
      {activeTab === "transactions" && (
        <div className="glass-card rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-xl space-y-4 print:border-none print:shadow-none print:p-0">
          <div className="flex justify-between items-center print:hidden">
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Recorded Payment Receipts &amp; Installments</span>
              </h2>
              <p className="text-xs text-slate-400">
                Detailed chronological record of every installment received from customers against bills
              </p>
            </div>
            <div className="text-xs font-bold text-slate-400">
              Showing <span className="text-amber-400">{filteredPayments.length}</span> receipts
            </div>
          </div>

          {loading ? (
            <div className="text-center py-16 text-slate-400 font-medium">Loading payment records...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                <IndianRupee className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-slate-400">No payment receipts found in this period.</p>
              <p className="text-xs text-slate-500">Click &quot;Record Payment&quot; above to log an installment.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse print:text-black">
                  <thead>
                    <tr className="border-b border-slate-800 print:border-black text-slate-400 print:text-black font-bold uppercase tracking-wider text-[11px] bg-slate-950/40 print:bg-gray-100">
                      <th className="p-3 print:p-1.5">Date</th>
                      <th className="p-3 print:p-1.5">Receipt #</th>
                      <th className="p-3 print:p-1.5">Customer Name</th>
                      <th className="p-3 print:p-1.5">Invoice #</th>
                      <th className="p-3 print:p-1.5 text-right">Bill Total</th>
                      <th className="p-3 print:p-1.5 text-right font-black text-emerald-400 print:text-black">
                        Amount Paid
                      </th>
                      <th className="p-3 print:p-1.5">Mode</th>
                      <th className="p-3 print:p-1.5">Reference / Notes</th>
                      <th className="p-3 print:p-1.5 text-right print:hidden">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 print:divide-gray-300">
                    {filteredPayments.map((p: any) => (
                      <tr key={p._id} className="hover:bg-slate-800/40 print:hover:bg-transparent transition-colors">
                        <td className="p-3 print:p-1.5 font-medium whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="p-3 print:p-1.5 font-mono font-bold text-amber-400 print:text-black whitespace-nowrap">
                          {p.paymentNumber}
                        </td>
                        <td className="p-3 print:p-1.5 font-extrabold uppercase text-white print:text-black">
                          {p.customerName}
                        </td>
                        <td className="p-3 print:p-1.5 font-bold">
                          {p.billId ? (
                            <Link
                              href={`/bills/${p.billId}`}
                              className="text-blue-400 hover:underline print:text-black flex items-center gap-1"
                            >
                              <span>{p.invoiceNo || "View Bill"}</span>
                              <ExternalLink className="w-3 h-3 print:hidden" />
                            </Link>
                          ) : (
                            <span className="text-slate-400 print:text-black">{p.invoiceNo || "On-Account"}</span>
                          )}
                        </td>
                        <td className="p-3 print:p-1.5 text-right font-mono">
                          {p.billGrandTotal ? `₹${formatCurrency(p.billGrandTotal)}` : "--"}
                        </td>
                        <td className="p-3 print:p-1.5 text-right font-black text-emerald-400 print:text-black text-sm">
                          ₹{formatCurrency(p.amount)}
                        </td>
                        <td className="p-3 print:p-1.5 font-semibold">
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 print:border-none print:p-0 text-[10px] text-amber-300 print:text-black">
                            {p.paymentMode}
                          </span>
                        </td>
                        <td className="p-3 print:p-1.5 text-slate-400 print:text-black max-w-xs truncate">
                          {p.referenceNo ? <span className="font-mono text-slate-300 print:text-black">{p.referenceNo} </span> : ""}
                          {p.notes || "--"}
                        </td>
                        <td className="p-3 print:p-1.5 text-right print:hidden">
                          <button
                            onClick={() => handleDeletePayment(p._id)}
                            className="p-1.5 hover:bg-red-950/80 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                            title="Delete Payment Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-700 print:border-black font-extrabold bg-slate-900/60 print:bg-gray-100">
                      <td colSpan={5} className="p-3 print:p-1.5 text-right uppercase tracking-wider text-slate-300 print:text-black">
                        Total Collected in Selected Range:
                      </td>
                      <td className="p-3 print:p-1.5 text-right font-black text-emerald-400 print:text-black text-base">
                        ₹{formatCurrency(filteredPayments.reduce((s: number, p: any) => s + (p.amount || 0), 0))}
                      </td>
                      <td colSpan={3} className="print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View for Payment Receipts */}
              <div className="block sm:hidden space-y-3 print:hidden">
                {filteredPayments.map((p: any) => (
                  <div
                    key={p._id}
                    className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2.5 shadow-md"
                  >
                    <div className="flex justify-between items-start border-b border-slate-800/80 pb-2">
                      <div>
                        <span className="font-mono text-xs font-black text-amber-400">
                          #{p.paymentNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          📅 {formatDate(p.date)}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-bold text-amber-300">
                        {p.paymentMode}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Customer:</span>
                        <span className="font-black text-white uppercase truncate block max-w-[170px]">
                          {p.customerName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Amount Paid:</span>
                        <span className="font-black text-emerald-400 text-base">
                          ₹{formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/50">
                      <span className="text-slate-400 text-[11px]">
                        Invoice: {p.invoiceNo ? `#${p.invoiceNo}` : "Advance Payment"}
                      </span>
                      <button
                        onClick={() => handleDeletePayment(p._id)}
                        className="text-xs text-red-400 hover:bg-red-950/60 p-1.5 rounded-lg flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Printable Footer with Signature (Visible ONLY when Printing / PDF Export) */}
      <div className="hidden print:block pt-8 font-sans">
        <div className="border-t-2 border-black pt-4 flex justify-between items-end text-xs">
          <div>
            <p className="font-bold">Summary Status:</p>
            <p>Total Sales Invoiced: ₹{formatCurrency(kpi.totalBilled)}</p>
            <p>Total Transport Charges: ₹{formatCurrency(kpi.totalTransportCharges)}</p>
            <p>Total Payments Collected: ₹{formatCurrency(kpi.totalCollected)}</p>
            <p>Total Outstanding Balance: ₹{formatCurrency(kpi.totalOutstanding)}</p>
            <p className="mt-2 text-[10px] text-gray-500">Generated automatically by QuarryBilling System</p>
          </div>
          <div className="text-center">
            <div className="w-48 border-b border-black mb-1"></div>
            <p className="font-bold uppercase">{company.authorisedSignatoryText || "Authorised Signatory"}</p>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="glass-card rounded-3xl p-6 max-w-lg w-full border border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  ₹
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Record Customer Payment</h3>
                  <p className="text-xs text-slate-400">Log full or partial installment payment towards bill or account</p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
              {/* Customer Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={paymentForm.customerName}
                  onChange={(e) => handleCustomerChangeInModal(e.target.value)}
                  list="customer-suggestions"
                  placeholder="Type or select customer name..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-bold focus:border-amber-500 focus:outline-none"
                />
                <datalist id="customer-suggestions">
                  {customersList.map((c: any) => (
                    <option key={c._id} value={c.name} />
                  ))}
                </datalist>
              </div>

              {/* Bill Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Bill / Invoice (Optional)
                </label>
                {loadingBills ? (
                  <div className="text-xs text-slate-500 py-1">Loading customer bills...</div>
                ) : (
                  <select
                    value={paymentForm.billId}
                    onChange={(e) => handleBillSelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">-- General On-Account Payment (No Specific Bill) --</option>
                    {customerBills.map((b: any) => {
                      const grandTotal = b.grandTotal || 0;
                      const paid = b.paidAmount || 0;
                      const rem = Math.max(0, grandTotal - paid);
                      return (
                        <option key={b._id} value={b._id}>
                          Invoice #{b.invoiceNo} (Date: {b.date}) - Total: ₹{formatCurrency(grandTotal)} | Bal: ₹{formatCurrency(rem)} [{b.paymentStatus || "UNPAID"}]
                        </option>
                      );
                    })}
                  </select>
                )}
                {paymentForm.billId && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    ✓ Payment will be credited directly to this bill and will update its status!
                  </p>
                )}
              </div>

              {/* Amount & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Payment Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="e.g. 10000 or 90000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2.5 text-sm font-extrabold text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Payment Mode & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">🏦 Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="Cheque">📜 Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Reference / UTR / Cheque #
                  </label>
                  <input
                    type="text"
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    placeholder="e.g. UTR12345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Part payment 1st installment, balance pending"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {submittingPayment ? "Recording Payment..." : "Save Payment Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
