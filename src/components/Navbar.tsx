"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PlusCircle, FileText, Settings, LogOut, Home, Users } from "lucide-react";

export default function Navbar({ user }: { user?: any } = {}) {
  const pathname = usePathname();
  const router = useRouter();

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
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "All Bills", href: "/bills", icon: FileText },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black tracking-wider text-base shadow-lg shadow-amber-500/20">
              QB
            </div>
            <span className="text-lg font-extrabold text-white tracking-wide">
              Quarry<span className="text-amber-400">Billing</span>
            </span>
          </div>

          {/* Nav Items */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <Link
              href="/bills/new"
              className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Bill</span>
            </Link>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
