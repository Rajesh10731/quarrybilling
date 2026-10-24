/** How much of a purchase load has been sold on sales bills (back-to-back trading, no stock). */
export default function SaleStatusBadge({
  status,
  soldQty = 0,
  qty = 0,
  unit = "",
}: {
  status?: string;
  soldQty?: number;
  qty?: number;
  unit?: string;
}) {
  const s = status || "NOT_SOLD";
  const style =
    s === "SOLD"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
      : s === "PARTLY_SOLD"
      ? "bg-amber-500/15 text-amber-400 border-amber-500/35"
      : "bg-slate-800 text-slate-400 border-slate-700";
  const label = s === "SOLD" ? "SOLD" : s === "PARTLY_SOLD" ? `SOLD ${soldQty}/${qty} ${unit}` : "NOT SOLD";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${style}`} title="Quantity of this load sold on sales bills">
      {label}
    </span>
  );
}

/** Trade margin of a load on what has been sold so far: green for a margin, red for a loss. */
export function MarginTag({ profit, soldQty = 0 }: { profit?: number; soldQty?: number }) {
  if (!soldQty) return null;
  const value = Math.round(profit || 0);
  const loss = value < 0;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border whitespace-nowrap ${
        loss ? "bg-red-500/15 text-red-400 border-red-500/35" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/35"
      }`}
      title="Trade margin on the quantity sold (income − cost, GST excluded)"
    >
      {loss ? "LOSS" : "MARGIN"} ₹{Math.abs(value).toLocaleString("en-IN")}
    </span>
  );
}
