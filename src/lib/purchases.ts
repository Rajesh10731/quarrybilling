import mongoose from "mongoose";
import { Purchase, IPurchase } from "@/models/Purchase";
import { numberToWords } from "@/lib/utils";
import { LedgerError, exactName, round2, statusFor, toISODate, todayISO, upsertVendor } from "@/lib/ledger";

const TAX_PERCENT: Record<string, number> = { "5%": 5, "12%": 12, "18%": 18 };

/** Validate the entry and compute its money fields on the server (client totals are not trusted). */
export function computePurchaseTotals(body: any) {
  const num = (v: unknown) => Number(v) || 0;
  const qty = num(body.qty);
  const rate = num(body.rate);
  const lorryFreight = num(body.lorryFreight);
  const loadingCharges = num(body.loadingCharges);
  const otherCharges = num(body.otherCharges);

  if (!(qty > 0)) throw new LedgerError("Quantity / weight must be greater than 0");
  if (rate < 0 || lorryFreight < 0 || loadingCharges < 0 || otherCharges < 0) {
    throw new LedgerError("Rate and charges cannot be negative");
  }

  const materialAmount = round2(qty * rate);
  const taxAmount = round2((materialAmount * (TAX_PERCENT[body.taxRate] || 0)) / 100);
  const freightToAdd = body.freightPaidBy === "Paid by Us" ? lorryFreight : 0;
  const grandTotal = round2(materialAmount + taxAmount + freightToAdd + loadingCharges + otherCharges);

  return { qty, rate, lorryFreight, loadingCharges, otherCharges, materialAmount, taxAmount, grandTotal, amountInWords: numberToWords(grandTotal) };
}

/** Reject an inward slip number that is already used by another entry. */
export async function assertUniqueInwardNo(inwardNo: string, excludeId?: string) {
  const filter: any = { inwardNo: exactName(inwardNo) };
  if (excludeId) filter._id = { $ne: excludeId };
  const dup = await Purchase.findOne(filter).select("_id").lean();
  if (dup) throw new LedgerError(`Inward slip number "${inwardNo.trim()}" is already used`, 409);
}

/** Recompute paidAmount / status / latest payment info from the payment history. */
export function syncPurchasePayments(purchase: IPurchase) {
  const payments = [...(purchase.payments || [])].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const paid = round2(payments.reduce((sum, p) => sum + (p.amount || 0), 0));
  const last = payments[payments.length - 1];
  purchase.paidAmount = paid;
  purchase.paymentStatus = statusFor(paid, purchase.grandTotal || 0);
  purchase.paymentDate = last?.date || "";
  purchase.paymentMode = last?.mode || purchase.paymentMode || "Cash";
  purchase.paymentRef = last?.ref || "";
}

/** Add one payment installment to a purchase, refusing to pay more than the balance. */
export async function addPurchasePayment(
  id: string,
  input: { amount: unknown; date?: string; mode?: string; ref?: string; notes?: string }
) {
  if (!mongoose.isValidObjectId(id)) throw new LedgerError("Invalid purchase reference");
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new LedgerError("Purchase not found", 404);

  const amount = round2(Number(input.amount));
  if (!(amount > 0)) throw new LedgerError("Payment amount must be greater than zero");
  const balance = round2((purchase.grandTotal || 0) - (purchase.paidAmount || 0));
  if (amount > balance + 0.005) {
    throw new LedgerError(
      balance > 0
        ? `Payment ₹${amount} is more than the balance payable ₹${balance}`
        : `Inward ${purchase.inwardNo} is already fully paid`
    );
  }

  purchase.payments.push({
    amount,
    date: toISODate(input.date) || todayISO(),
    mode: input.mode || "Cash",
    ref: input.ref || "",
    notes: input.notes || "",
  });
  syncPurchasePayments(purchase);
  await purchase.save();
  return purchase;
}

/** Build the vendor link + clean fields shared by create and update. */
export async function linkVendor(body: any) {
  const vendor = await upsertVendor({
    name: body.vendorName,
    mobile: body.vendorMobile,
    gstin: body.vendorGstin,
    address: body.vendorAddress,
    quarryLocation: body.quarryLocation,
  });
  return vendor?._id;
}

/** Fields the client may never set directly on a purchase (they are derived from payments). */
export const DERIVED_PAYMENT_FIELDS = ["payments", "paidAmount", "paymentStatus", "paymentDate", "paymentMode", "paymentRef"] as const;

/** Money summary for a vendor: what is still payable = opening balance + unpaid part of every purchase. */
export function vendorSummary(openingBalance: number, purchases: { grandTotal?: number; paidAmount?: number; qty?: number }[]) {
  const totalAmount = round2(purchases.reduce((s, p) => s + (p.grandTotal || 0), 0));
  const totalPaid = round2(purchases.reduce((s, p) => s + (p.paidAmount || 0), 0));
  const unpaidOnPurchases = purchases.reduce((s, p) => s + Math.max(0, (p.grandTotal || 0) - (p.paidAmount || 0)), 0);
  return {
    openingBalance: openingBalance || 0,
    totalPurchases: purchases.length,
    totalAmount,
    totalPaid,
    pendingBalance: round2((openingBalance || 0) + unpaidOnPurchases),
    totalTonnage: round2(purchases.reduce((s, p) => s + (p.qty || 0), 0)),
  };
}

/** Purchases belonging to a vendor (linked by id, or by exact name for older entries). */
export function vendorPurchaseFilter(vendor: { _id: unknown; name: string }): Record<string, any> {
  return { $or: [{ vendorId: vendor._id }, { vendorName: exactName(vendor.name) }] };
}
