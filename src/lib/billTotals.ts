import { numberToWords } from "@/lib/utils";

export type DiscountType = "NONE" | "PERCENT" | "AMOUNT";

export interface BillTotalsInput {
  items: { qty?: number | string; price?: number | string; [key: string]: unknown }[];
  taxRate?: string;
  loadingCharges?: number | string;
  lorryFreight?: number | string;
  discountType?: DiscountType | string;
  discountValue?: number | string;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Bill money rules, shared by the bill form and the server so both always agree:
 *   material amount  = Σ qty × rate
 *   discount         = % of the material amount, or a fixed ₹ amount
 *   taxable value    = material amount − discount      (GST is charged on this)
 *   grand total      = taxable value + GST + loading charges + lorry freight
 * `error` describes an invalid discount; totals are still returned (discount ignored).
 */
export function computeBillTotals(input: BillTotalsInput) {
  let totalQty = 0;
  let material = 0;
  const items = (input.items || []).map((item, idx) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const amount = round2(qty * price);
    totalQty += qty;
    material += amount;
    return { ...item, sn: idx + 1, qty, price, amount };
  });
  material = round2(material);

  const discountType: DiscountType = input.discountType === "PERCENT" || input.discountType === "AMOUNT" ? input.discountType : "NONE";
  const discountValue = discountType === "NONE" ? 0 : Number(input.discountValue) || 0;
  let discountAmount = 0;
  let error = "";
  if (discountValue < 0) error = "Discount cannot be negative.";
  else if (discountType === "PERCENT" && discountValue > 100) error = "Discount percentage cannot be more than 100%.";
  else if (discountType === "PERCENT") discountAmount = round2((material * discountValue) / 100);
  else if (discountType === "AMOUNT") discountAmount = round2(discountValue);
  if (!error && discountAmount > material) error = "Discount cannot be more than the material amount.";
  if (error) discountAmount = 0;

  const taxableValue = round2(material - discountAmount);
  const rate = input.taxRate && input.taxRate !== "Exempt" && input.taxRate !== "0%" ? parseFloat(input.taxRate) || 0 : 0;
  const totalTax = round2((taxableValue * rate) / 100);
  const loading = Number(input.loadingCharges) || 0;
  const freight = Number(input.lorryFreight) || 0;
  const grandTotal = round2(taxableValue + totalTax + loading + freight);

  return {
    items,
    totalQty: round2(totalQty),
    taxableAmount: material, // material amount before discount (kept for existing bills)
    discountType,
    discountValue: round2(discountValue),
    discountAmount,
    taxableValue,
    totalTax,
    grandTotal,
    amountInWords: numberToWords(grandTotal),
    error,
  };
}
