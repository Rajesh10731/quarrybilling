"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mountain, Lock, Mail, ArrowRight, CheckCircle2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@quarry.com");
  const [password, setPassword] = useState("admin123");
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
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-xl shadow-amber-500/20 mb-2">
            <Mountain className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Quarry<span className="text-amber-400">Billing</span>
          </h1>
          <p className="text-sm text-slate-400">Sign in to manage and generate quarry supply bills</p>
        </div>

        {/* Login Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {seedSuccess && (
            <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{seedSuccess}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none transition-all"
                  placeholder="admin@quarry.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign In to System"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Seed Button */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <p className="text-xs text-slate-400 mb-2">First time running local setup?</p>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            >
              {seeding ? "Seeding Data..." : "⚡ Seed Admin User & Screenshot Sample Bill"}
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          Demo Admin: <span className="text-slate-300">admin@quarry.com</span> | Password: <span className="text-slate-300">admin123</span>
        </div>
      </div>
    </div>
  );
}
