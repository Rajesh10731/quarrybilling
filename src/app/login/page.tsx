"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

// Demo login hints and the sample-data button are for local use only, never on the live site
const DEMO = process.env.NODE_ENV !== "production";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO ? "admin@quarry.com" : "");
  const [password, setPassword] = useState(DEMO ? "admin123" : "");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState("");
  const [seedSuccess, setSeedSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Invalid credentials");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    setError("");
    setSeedSuccess("");

    try {
      const res = await fetch("/api/seed");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to seed database");
      }

      setSeedSuccess("Database seeded! Admin user & sample invoice created.");
      setEmail("admin@quarry.com");
      setPassword("admin123");
    } catch (err: any) {
      setError(err.message || "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 p-3.5 rounded-2xl shadow-xl shadow-amber-500/30 mb-1 glow-amber">
            <Mountain className="w-9 h-9" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Quarry<span className="text-amber-400">Billing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">High-Performance Industrial Quarry Billing & Accounting</p>
        </div>

        {/* Login Form Card */}
        <div className="glass-card border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {seedSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-2xl text-xs flex items-center gap-2 font-semibold shadow-lg glow-emerald">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{seedSuccess}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Email Address
                </label>
                {DEMO && <span className="text-[10px] text-amber-400/80 font-medium">admin@quarry.com</span>}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none transition-all font-medium"
                  placeholder={DEMO ? "admin@quarry.com" : "you@example.com"}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Password
                </label>
                {DEMO && <span className="text-[10px] text-amber-400/80 font-medium">admin123</span>}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-3 text-base sm:text-sm text-white focus:border-amber-500 focus:outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Big 1-Click Login Button for Easy Access */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/25 transition-all text-sm active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign In to Portal"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {DEMO && (
            <button
              type="button"
              onClick={() => {
                setEmail("admin@quarry.com");
                setPassword("admin123");
              }}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/20 transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔑 Auto-Fill Demo Credentials</span>
            </button>
            )}
          </form>

          {/* Quick Seed Button (local only) */}
          {DEMO && (
          <div className="pt-4 border-t border-slate-800/80 text-center space-y-2">
            <p className="text-[11px] text-slate-400">First time setting up local database?</p>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            >
              {seeding ? "Seeding..." : "⚡ Seed Admin Credentials & Sample Invoice"}
            </button>
          </div>
          )}
        </div>

        {DEMO && (
          <div className="text-center text-xs text-slate-500 font-medium">
            Demo: <span className="text-amber-400 font-bold">admin@quarry.com</span> • <span className="text-amber-400 font-bold">admin123</span>
          </div>
        )}
      </div>
    </div>
  );
}

