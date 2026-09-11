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
  Truck,
  Building2,
  Plus,
  ChevronRight,
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

  const navLinks = [
    { name: "Dashboard", subtitle: "Overview", href: "/dashboard", icon: Home },
    { name: "Sales Bills", subtitle: "Customer Invoices", href: "/bills", icon: FileText },
    { name: "Purchases", subtitle: "Inward Lorry", href: "/purchases", icon: Truck },
    { name: "Customers", subtitle: "Client Directory", href: "/customers", icon: Users },
    { name: "Vendors", subtitle: "Material Suppliers", href: "/vendors", icon: Building2 },
    { name: "Payment Reports", subtitle: "Ledgers & Due", href: "/reports/payments", icon: CreditCard },
    { name: "Settings", subtitle: "Company Profile", href: "/settings", icon: Settings },
  ];

  const navCategories = [
    {
      title: "OPERATIONS",
      links: [
        { name: "Dashboard", subtitle: "Live Overview & Analytics", href: "/dashboard", icon: Home },
        { name: "Sales Bills", subtitle: "Customer Invoices & Outward", href: "/bills", icon: FileText },
        { name: "Purchases", subtitle: "Inward Lorry Raw Materials", href: "/purchases", icon: Truck },
      ],
    },
    {
      title: "LEDGERS & DIRECTORY",
      links: [
        { name: "Customers", subtitle: "Client Directory & Statements", href: "/customers", icon: Users },
        { name: "Vendors", subtitle: "Raw Material Suppliers", href: "/vendors", icon: Building2 },
        { name: "Payment Reports", subtitle: "Receivables & Ledgers", href: "/reports/payments", icon: CreditCard },
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Sidebar Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-xl border border-slate-800/80 transition-all active:scale-95 shrink-0"
                title="Open Sidebar"
                aria-label="Open Sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-2.5 group min-w-0">
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
            <div className="hidden lg:flex items-center space-x-1 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/80">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href || (link.href !== "/dashboard" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-amber-500/20 to-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* Quick Actions (Desktop) */}
            <div className="hidden md:flex items-center space-x-2.5">
              <Link
                href="/bills/new"
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Sales Bill</span>
              </Link>

              <Link
                href="/purchases/new"
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl border border-amber-500/30 transition-all text-xs active:scale-95"
              >
                <Truck className="w-4 h-4" />
                <span>+ Inward Load</span>
              </Link>

              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/40 rounded-xl border border-transparent hover:border-red-900/50 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
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
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sidebar Drawer Panel */}
          <aside className="relative w-[88vw] max-w-[340px] sm:max-w-[380px] bg-slate-950/98 border-r border-slate-800/90 shadow-[25px_0_60px_rgba(0,0,0,0.9)] flex flex-col justify-between z-50 h-full overflow-hidden animate-in slide-in-from-left duration-300">
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
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
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
                      {user?.email || "admin@quarry.com"}
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
      )}

      {/* Floating Bottom Navigation Bar for Mobile (Thumb Friendly) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-2xl border-t border-slate-800/80 shadow-[0_-10px_30px_rgba(0,0,0,0.7)] px-2 py-1 bottom-nav-safe flex items-center justify-around">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition-all relative ${
            pathname === "/dashboard" ? "text-amber-400 font-extrabold" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Home</span>
          {pathname === "/dashboard" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] absolute bottom-0.5" />
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
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] absolute bottom-0.5" />
          )}
        </Link>

        {/* Prominent Center Action Button */}
        <button
          onClick={() => setShowQuickCreateModal(true)}
          className="flex flex-col items-center -mt-6 group"
          aria-label="Create New Record"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-slate-950 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.45)] ring-4 ring-slate-950 group-active:scale-95 transition-all font-black border border-amber-300/40">
            <Plus className="w-6 h-6 stroke-[3]" />
          </div>
          <span className="text-[10px] text-amber-400 font-black mt-0.5 drop-shadow">+ Add</span>
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
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] absolute bottom-0.5" />
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
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
