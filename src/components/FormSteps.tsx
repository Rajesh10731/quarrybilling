"use client";

import { ArrowLeft, ArrowRight, Check, Printer, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface StepDef {
  title: string;
  subtitle: string;
}

/** Numbered step indicator. Steps already reached can be clicked to go back to them. */
export function StepIndicator({
  steps,
  current,
  maxReached,
  onGo,
}: {
  steps: StepDef[];
  current: number;
  maxReached: number;
  onGo: (index: number) => void;
}) {
  return (
    <ol className="flex items-stretch gap-2 sm:gap-3 mb-5" aria-label="Form steps">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= maxReached;
        return (
          <li key={s.title} className={`min-w-0 ${active ? "flex-1" : "flex-none sm:flex-1"}`}>
            <button
              type="button"
              onClick={() => reachable && onGo(i)}
              disabled={!reachable}
              aria-current={active ? "step" : undefined}
              className={`w-full h-full flex items-center gap-2.5 text-left rounded-2xl border px-3 py-2.5 transition-all duration-200 disabled:cursor-not-allowed ${
                active
                  ? "bg-amber-500/15 border-amber-500/40"
                  : done
                  ? "bg-slate-900 border-slate-800 hover:border-amber-500/40"
                  : "bg-slate-900/60 border-slate-800 opacity-70"
              }`}
            >
              <span
                className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-sm font-black ${
                  active ? "bg-amber-500 text-slate-950" : done ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </span>
              <span className={`min-w-0 ${active ? "" : "hidden sm:inline"}`} title={s.title}>
                <span className={`text-sm font-bold truncate ${active ? "block text-amber-400" : "hidden sm:block text-slate-200"}`}>{s.title}</span>
                <span className="hidden sm:block text-[11px] text-slate-400 truncate">{s.subtitle}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Back / Next / Save bar, plus a sticky version with the running total on phones. */
export function StepFooter({
  step,
  totalSteps,
  saving,
  total,
  saveLabel,
  onBack,
  onNext,
  onSave,
  onSavePrint,
}: {
  step: number;
  totalSteps: number;
  saving: boolean;
  total: number;
  saveLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSave: () => void;
  onSavePrint?: () => void;
}) {
  const last = step === totalSteps - 1;
  const btnBase = "flex items-center justify-center gap-1.5 rounded-xl font-bold transition-all active:scale-[0.97] disabled:opacity-50";
  const buttons = (compact: boolean) => (
    <>
      {step > 0 && (
        <button type="button" onClick={onBack} disabled={saving} className={`${btnBase} ${compact ? "px-3 py-2.5 text-xs" : "px-5 py-3 text-sm"} bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700`}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      )}
      {!last ? (
        <button type="button" onClick={onNext} className={`${btnBase} ${compact ? "px-4 py-2.5 text-xs" : "px-6 py-3 text-sm"} bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20`}>
          Next <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <>
          <button type="button" onClick={onSave} disabled={saving} className={`${btnBase} ${compact ? "px-4 py-2.5 text-xs" : "px-6 py-3 text-sm"} bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20`}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : saveLabel}
          </button>
          {onSavePrint && (
            <button type="button" onClick={onSavePrint} disabled={saving} title="Save & Print" className={`${btnBase} ${compact ? "p-2.5" : "px-5 py-3 text-sm"} bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700`}>
              <Printer className="w-4 h-4" /> {!compact && "Save & Print"}
            </button>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <div className="hidden lg:flex justify-between items-center pt-2">
        <div className="text-sm text-slate-400">
          Step {step + 1} of {totalSteps} · Total <span className="font-black text-emerald-400">₹{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-3">{buttons(false)}</div>
      </div>

      {/* Sticky bar on phones and tablets */}
      <div className="lg:hidden fixed bottom-[calc(3.25rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 p-3 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 flex items-center justify-between gap-3 shadow-2xl">
        <div className="min-w-0">
          <span className="text-[10px] text-slate-400 block font-bold uppercase">
            Step {step + 1}/{totalSteps} · Total
          </span>
          <span className="text-lg font-black text-amber-400">₹{formatCurrency(total)}</span>
        </div>
        <div className="flex items-center gap-2">{buttons(true)}</div>
      </div>
    </>
  );
}
