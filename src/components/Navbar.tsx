"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PlusCircle,
  FileText,
  Settings,
  LogOut,
  Home,
  Users,
  Menu,
  X,
  Mountain,
  CreditCard,
  TrendingUp,
  Truck,
  Building2,
  Plus,
  ChevronRight,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";

export default function Navbar({ user }: { user?: any } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);

  // Prevent background scrolling and allow Escape to dismiss when sidebar is open
  useEffect(() => {
    if (mobileMenuOpen || showQuickCreateModal) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setMobileMenuOpen(false);
          setShowQuickCreateModal(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen, showQuickCreateModal]);

  // Don't show navbar on login page
  if (pathname === "/login") return null;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  };

  // Top bar: the four most-used sections. Customers, Vendors, Payment Reports and Settings are in the side menu.
  const navLinks = [
    { name: "Dashboard", subtitle: "Overview", href: "/dashboard", icon: Home },
    { name: "Sales Bills", subtitle: "Customer Invoices", href: "/bills", icon: FileText },
    { name: "Quotations", subtitle: "Sales Quotes", href: "/quotations", icon: ClipboardList },
    { name: "Purchases", subtitle: "Inward Lorry", href: "/purchases", icon: Truck },
  ];

  const navCategories = [
    {
      title: "OPERATIONS",
      links: [
        { name: "Dashboard", subtitle: "Live Overview & Analytics", href: "/dashboard", icon: Home },
        { name: "Sales Bills", subtitle: "Customer Invoices & Outward", href: "/bills", icon: FileText },
        { name: "Quotations", subtitle: "Sales Quotes", href: "/quotations", icon: ClipboardList },
        { name: "Purchases", subtitle: "Inward Lorry Raw Materials", href: "/purchases", icon: Truck },
      ],
    },
    {
      title: "LEDGERS & DIRECTORY",
      links: [
        { name: "Customers", subtitle: "Client Directory & Statements", href: "/customers", icon: Users },
        { name: "Vendors", subtitle: "Raw Material Suppliers", href: "/vendors", icon: Building2 },
        { name: "Payment Reports", subtitle: "Receivables & Ledgers", href: "/reports/payments", icon: CreditCard },
        { name: "Trade Margin", subtitle: "Margin on each load sold", href: "/reports/trade-margin", icon: TrendingUp },
      ],
    },
    {
      title: "SYSTEM",
      links: [
        { name: "Settings", subtitle: "Company Profile & GST Rates", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <>
      {/* Top Header */}
      <nav className="glass-header sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Sidebar Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-900 active:bg-slate-800 rounded-xl border border-slate-800/80 transition-all duration-200 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 shrink-0"
                title="Open Sidebar"
                aria-label="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-2.5 group min-w-0 lg:shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black tracking-wider text-base shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform shrink-0">
                  <Mountain className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm sm:text-base font-black text-white tracking-wide block leading-tight truncate">
                    Quarry<span className="text-amber-400">Billing</span>
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-wider uppercase block truncate">
                    Quarry ERP
                  </span>
                </div>
              </Link>
            </div>

            {/* Nav Items (Desktop) */}
            <div className="hidden lg:flex items-center space-x-[5px] bg-slate-950/60 p-[7px] rounded-2xl border border-slate-800/80">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    title={link.name}
                    className={`flex items-center space-x-[7px] px-3 py-[7px] rounded-[14px] text-[0.9rem] font-bold whitespace-nowrap transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className={`w-[17px] h-[17px] ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Sign out (Desktop); new bills / inward loads are created from their list pages */}
            <div className="hidden md:flex items-center space-x-2.5">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-[7px] px-3 py-[7px] rounded-[14px] text-[0.9rem] font-bold whitespace-nowrap text-red-400 bg-red-950 hover:bg-red-900 border border-red-800 transition-all duration-200 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                title="Sign Out"
              >
                <LogOut className="w-[17px] h-[17px]" />
                <span>Sign Out</span>
              </button>
            </div>

            {/* Mobile Header Quick Actions */}
            <div className="flex lg:hidden items-center space-x-2">
              <button
                onClick={() => setShowQuickCreateModal(true)}
                className="p-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 rounded-xl font-bold shadow-md shadow-amber-500/20 active:scale-90 transition-transform"
                title="Create New"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Slide-Over Beautiful Sidebar Drawer */}
      {/* Always mounted so it can slide in and out smoothly; hidden (and not focusable) when closed */}
      <div
        className={`fixed inset-0 z-50 flex transition-[visibility] duration-300 ${mobileMenuOpen ? "visible" : "invisible pointer-events-none"}`}
        aria-hidden={!mobileMenuOpen}
      >
          {/* Backdrop Blur Overlay */}
          <div
            className={`fixed inset-0 bg-slate-400/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${mobileMenuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar Drawer Panel */}
          <aside className={`relative w-[88vw] max-w-[340px] sm:max-w-[380px] bg-slate-950/98 border-r border-slate-800/90 shadow-[12px_0_40px_rgba(60,70,110,0.15)] flex flex-col justify-between z-50 h-full overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
            {/* Header & Brand */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950 shrink-0">
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 group min-w-0"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform shrink-0">
                    <Mountain className="w-5 h-5 text-slate-950" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-white tracking-wide truncate">
                        Quarry<span className="text-amber-400">Billing</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-extrabold border border-amber-500/30">
                        ERP
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(140,199,166,0.6)] animate-pulse" />
                      <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                        Live System
                      </span>
                    </div>
                  </div>
                </Link>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors shrink-0 ml-2"
                  aria-label="Close Sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Card */}
              <div className="mt-4 p-3 bg-slate-900/90 rounded-2xl border border-slate-800/90 flex items-center justify-between shadow-inner">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/10 border border-amber-500/30 text-amber-400 font-black flex items-center justify-center text-sm shrink-0">
                    {(user?.name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {user?.name || "Administrator"}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {user?.email || ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Admin</span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Link
                  href="/bills/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-start p-2.5 bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <PlusCircle className="w-4 h-4 text-slate-950" />
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-slate-950/20 px-1 rounded">
                      Outward
                    </span>
                  </div>
                  <span className="text-xs font-black leading-tight">+ Sales Bill</span>
                </Link>

                <Link
                  href="/purchases/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex flex-col items-start p-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl border border-amber-500/40 shadow-md active:scale-95 transition-all group"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <Truck className="w-4 h-4 text-amber-400" />
                    <span className="text-[9px] uppercase tracking-wider font-bold bg-amber-500/10 px-1 rounded text-amber-400">
                      Inward
                    </span>
                  </div>
                  <span className="text-xs font-black leading-tight">+ Inward Load</span>
                </Link>
              </div>
            </div>

            {/* Scrollable Navigation Sections */}
            <div className="flex-1 overflow-y-auto touch-scroll py-3 px-3 space-y-5">
              {navCategories.map((category) => (
                <div key={category.title} className="space-y-1.5">
                  <div className="px-3 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    {category.title}
                  </div>
                  <div className="space-y-1">
                    {category.links.map((link) => {
                      const Icon = link.icon;
                      const isActive =
                        pathname === link.href ||
                        (link.href !== "/dashboard" && pathname.startsWith(link.href));
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                            isActive
                              ? "bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 border-l-4 border-amber-400 font-bold shadow-sm"
                              : "text-slate-300 hover:text-white hover:bg-slate-900/90 border-l-4 border-transparent"
                          }`}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div
                              className={`p-2 rounded-xl transition-colors shrink-0 ${
                                isActive
                                  ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30"
                                  : "bg-slate-900 text-slate-400 group-hover:text-amber-400 group-hover:bg-slate-850 border border-slate-800"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-xs font-bold leading-snug truncate ${
                                  isActive ? "text-amber-300" : "text-slate-200 group-hover:text-white"
                                }`}
                              >
                                {link.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {link.subtitle}
                              </div>
                            </div>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 shrink-0 ${
                              isActive ? "text-amber-400" : "text-slate-600 group-hover:text-slate-400"
                            }`}
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950 space-y-3 shrink-0">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold text-red-400 bg-red-950/30 hover:bg-red-900/40 border border-red-900/50 transition-all active:scale-98"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out of System</span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1">
                <span>Quarry Billing ERP</span>
                <span className="font-semibold text-slate-400">v2.4 Pro</span>
              </div>
            </div>
          </aside>
      </div>

      {/* Floating Bottom Navigation Bar for Mobile (Thumb Friendly) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-4px_16px_rgba(60,70,110,0.08)] px-2 py-1 bottom-nav-safe flex items-center justify-around">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative ${
            pathname === "/dashboard" ? "text-amber-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
          {pathname === "/dashboard" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(102,118,204,0.5)] absolute bottom-0.5" />
          )}
        </Link>

        <Link
          href="/bills"
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative ${
            pathname.startsWith("/bills") && pathname !== "/bills/new"
              ? "text-amber-400 font-extrabold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Sales</span>
          {pathname.startsWith("/bills") && pathname !== "/bills/new" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(102,118,204,0.5)] absolute bottom-0.5" />
          )}
        </Link>

        {/* Prominent Center Action Button */}
        <button
          onClick={() => setShowQuickCreateModal(true)}
          className="flex flex-col items-center -mt-6 group"
          aria-label="Create new"
          title="Create new"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-[0_6px_16px_rgba(102,118,204,0.35)] ring-4 ring-slate-950 group-active:scale-95 transition-all font-black border border-amber-300/40">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
        </button>

        <Link
          href="/purchases"
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative ${
            pathname.startsWith("/purchases") && pathname !== "/purchases/new"
              ? "text-amber-400 font-extrabold"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Inward</span>
          {pathname.startsWith("/purchases") && pathname !== "/purchases/new" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(102,118,204,0.5)] absolute bottom-0.5" />
          )}
        </Link>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1.5 px-3 rounded-xl text-slate-400 hover:text-slate-200 transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </div>

      {/* Quick Create Popover Modal for Mobile */}
      {showQuickCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-400/35 backdrop-blur-[2px] p-0 sm:p-4 soft-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 safe-bottom">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Create New Record</h3>
                <p className="text-xs text-slate-400">Select what entry you want to create</p>
              </div>
              <button
                onClick={() => setShowQuickCreateModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/bills/new"
                onClick={() => setShowQuickCreateModal(false)}
                className="flex items-center space-x-3 p-4 bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:bg-amber-500/25 border border-amber-500/40 rounded-2xl text-slate-100 transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-amber-300">Sales Invoice (Customer Bill)</div>
                  <div className="text-xs text-slate-400">Dispatch stone/sand outward to client</div>
                </div>
              </Link>

              <Link
                href="/quotations/new"
                onClick={() => setShowQuickCreateModal(false)}
                className="flex items-center space-x-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-100 transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">Quotation</div>
                  <div className="text-xs text-slate-400">Quote material rates to a customer</div>
                </div>
              </Link>

              <Link
                href="/purchases/new"
                onClick={() => setShowQuickCreateModal(false)}
                className="flex items-center space-x-3 p-4 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 rounded-2xl text-slate-100 transition-all active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-black text-white">Inward Purchase (Vendor Load)</div>
                  <div className="text-xs text-slate-400">Raw boulders/material received from outside</div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
