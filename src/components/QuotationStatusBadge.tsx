const STYLES: Record<string, string> = {
  OPEN: "bg-blue-500/15 text-blue-400 border-blue-500/35",
  ACCEPTED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/35",
  REJECTED: "bg-red-500/15 text-red-400 border-red-500/35",
  CONVERTED: "bg-amber-500/15 text-amber-400 border-amber-500/35",
  EXPIRED: "bg-slate-800 text-slate-400 border-slate-700",
};

const LABELS: Record<string, string> = {
  OPEN: "OPEN",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CONVERTED: "BILLED",
  EXPIRED: "EXPIRED",
};

/** Quotation status pill; CONVERTED is shown as BILLED. */
export default function QuotationStatusBadge({ status }: { status?: string }) {
  const s = status || "OPEN";
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border inline-flex items-center ${STYLES[s] || STYLES.OPEN}`}>
      {LABELS[s] || s}
    </span>
  );
}
