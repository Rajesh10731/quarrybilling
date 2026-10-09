"use client";

import { CalendarDays, X } from "lucide-react";

export interface DateRange {
  from: string; // YYYY-MM-DD, "" = no lower limit
  to: string; // YYYY-MM-DD, "" = no upper limit
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function presets(): { label: string; range: DateRange }[] {
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [
    { label: "Today", range: { from: iso(now), to: iso(now) } },
    { label: "This Month", range: { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) } },
    { label: "This FY", range: { from: `${fyStart}-04-01`, to: `${fyStart + 1}-03-31` } },
    { label: "All", range: { from: "", to: "" } },
  ];
}

/** Keep records whose date (YYYY-MM-DD) falls inside the range; an empty end means no limit. */
export function inDateRange<T>(records: T[], range: DateRange, getDate: (r: T) => string | undefined): T[] {
  if (!range.from && !range.to) return records;
  return records.filter((r) => {
    const d = String(getDate(r) || "");
    if (!d) return false;
    if (range.from && d < range.from) return false;
    if (range.to && d > range.to) return false;
    return true;
  });
}

/** From / To date pickers with quick presets (Today, This Month, This FY, All). */
export default function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const active = presets().find((p) => p.range.from === value.from && p.range.to === value.to)?.label;
  const inputCls =
    "w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 sm:py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none";

  return (
    <div className="w-full lg:w-auto flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
      {/* Phones: From and To stacked full width (16px inputs do not fit side by side) */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 w-full sm:w-auto">
        <CalendarDays className="hidden sm:block w-4 h-4 text-slate-400 shrink-0" />
        <label className="sr-only" htmlFor="date-from">From date</label>
        <input
          id="date-from"
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputCls}
          title="From date"
        />
        <span className="hidden sm:inline text-xs text-slate-500 shrink-0">to</span>
        <label className="sr-only" htmlFor="date-to">To date</label>
        <input
          id="date-to"
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputCls}
          title="To date"
        />
        {(value.from || value.to) && (
          <button type="button" onClick={() => onChange({ from: "", to: "" })} title="Clear dates" className="self-end sm:self-auto flex items-center gap-1 p-2 sm:p-1 shrink-0 text-xs text-slate-400 hover:text-red-400">
            <X className="w-3.5 h-3.5" />
            <span className="sm:hidden">Clear dates</span>
          </button>
        )}
      </div>
      <div className="flex gap-1 w-full sm:w-auto">
        {presets().map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.range)}
            className={`flex-1 sm:flex-none px-2.5 py-2 sm:py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
              active === p.label ? "bg-amber-500 text-slate-950" : "bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
