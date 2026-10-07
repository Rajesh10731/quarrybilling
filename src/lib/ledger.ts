import mongoose from "mongoose";
import { Bill } from "@/models/Bill";
import { Payment, IPayment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { Vendor } from "@/models/Vendor";
import { CompanySettings } from "@/models/CompanySettings";

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

/** Thrown for user-facing validation problems; routes turn it into a 4xx response. */
export class LedgerError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Escape text so it is matched literally inside a MongoDB $regex. */
export function escapeRegex(text: string): string {
  return String(text ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive exact match for a name, safe for names like "RAVI (NAGERCOIL)". */
export function exactName(name: string) {
  return { $regex: `^${escapeRegex(String(name ?? "").trim())}$`, $options: "i" };
}

/** Case-insensitive "contains" match for search boxes; user text is matched literally. */
export function containsText(text: string) {
  return { $regex: escapeRegex(text), $options: "i" };
}

/** Normalise "DD-MM-YYYY", "DD/MM/YYYY" or "YYYY-MM-DD" to "YYYY-MM-DD". Other values are returned trimmed. */
export function toISODate(value: unknown): string {
  const s = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  return s;
}

export const todayISO = () => new Date().toISOString().split("T")[0];

export function statusFor(paid: number, total: number): PaymentStatus {
  if (paid > 0 && paid + 0.005 >= total) return "PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

/** Recompute a bill's paidAmount / paymentStatus from its recorded payment receipts. */
export async function recalcBill(billId: string | mongoose.Types.ObjectId) {
  const bill = await Bill.findById(billId);
  if (!bill) return null;
  const payments = await Payment.find({ billId: bill._id }).sort({ date: -1, createdAt: -1 });
  const paid = round2(payments.reduce((sum, p) => sum + (p.amount || 0), 0));
  bill.paidAmount = paid;
  bill.paymentStatus = statusFor(paid, bill.grandTotal || 0);
  bill.paymentDate = payments[0]?.date || "";
  await bill.save();
  return bill;
}

/** Next receipt number for a date, e.g. RCP-20261003-0002 (sequence restarts per day, never reused). */
async function nextPaymentNumber(dateISO: string) {
  const prefix = `RCP-${dateISO.replace(/-/g, "")}-`;
  const last = await Payment.findOne({ paymentNumber: { $regex: `^${escapeRegex(prefix)}` } })
    .sort({ paymentNumber: -1 })
    .select("paymentNumber")
    .lean();
  const lastSeq = last ? parseInt(String(last.paymentNumber).slice(prefix.length), 10) || 0 : 0;
  return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
}

interface NewPayment {
  date?: string;
  customerName: string;
  customerId?: string | mongoose.Types.ObjectId;
  billId?: string | mongoose.Types.ObjectId;
  invoiceNo?: string;
  amount: number;
  paymentMode?: string;
  referenceNo?: string;
  notes?: string;
}

/**
 * Record a customer receipt. Validates the amount, blocks overpaying a linked bill,
 * assigns a unique receipt number and updates the bill's paid status.
 */
export async function recordPayment(input: NewPayment) {
  const amount = round2(input.amount);
  if (!input.customerName?.trim()) throw new LedgerError("Customer name is required");
  if (!(amount > 0)) throw new LedgerError("Payment amount must be greater than zero");

  const date = toISODate(input.date) || todayISO();

  let bill = null;
  if (input.billId) {
    if (!mongoose.isValidObjectId(input.billId)) throw new LedgerError("Invalid bill reference");
    bill = await Bill.findById(input.billId);
    if (!bill) throw new LedgerError("Linked bill not found", 404);
    const paidSoFar = await sumBillPayments(bill._id);
    const balance = round2((bill.grandTotal || 0) - paidSoFar);
    if (amount > balance + 0.005) {
      throw new LedgerError(
        balance > 0
          ? `Payment ₹${amount} is more than the balance due ₹${balance} on invoice ${bill.invoiceNo}`
          : `Invoice ${bill.invoiceNo} is already fully paid`
      );
    }
  }

  let customerId = input.customerId;
  if (!customerId) {
    const existing = await Customer.findOne({ name: exactName(input.customerName) }).select("_id");
    customerId = existing?._id;
  }

  let payment = null;
  for (let attempt = 0; attempt < 5 && !payment; attempt++) {
    try {
      payment = await Payment.create({
        paymentNumber: await nextPaymentNumber(date),
        date,
        customerId: customerId || undefined,
        customerName: input.customerName.trim(),
        billId: bill?._id,
        invoiceNo: input.invoiceNo || bill?.invoiceNo || "",
        billGrandTotal: bill?.grandTotal || 0,
        amount,
        paymentMode: (input.paymentMode || "Cash") as IPayment["paymentMode"],
        referenceNo: input.referenceNo || "",
        notes: input.notes || "",
      });
    } catch (e: any) {
      // Another receipt took the same number at the same moment; try the next one.
      if (e?.code !== 11000) throw e;
    }
  }
  if (!payment) throw new LedgerError("Could not allocate a receipt number, please retry", 503);

  if (bill) await recalcBill(bill._id);
  return payment;
}

export async function sumBillPayments(billId: string | mongoose.Types.ObjectId) {
  const payments = await Payment.find({ billId }).select("amount").lean();
  return round2(payments.reduce((sum, p) => sum + (p.amount || 0), 0));
}

/** Keep only fields that carry a value, so blank form fields never erase saved master data. */
function nonBlank<T extends Record<string, unknown>>(data: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") (out as any)[k] = typeof v === "string" ? v.trim() : v;
  }
  return out;
}

/** Create the customer if new; otherwise fill in only the details provided. */
export async function upsertCustomer(data: { name: string; mobile?: string; gstin?: string; address?: string; deliveryPlace?: string; openingBalance?: number }) {
  const name = String(data.name ?? "").trim();
  if (!name) return null;
  const existing = await Customer.findOne({ name: exactName(name) });
  if (existing) {
    const { name: _ignored, ...rest } = data;
    const updates = nonBlank(rest as Record<string, unknown>);
    if (Object.keys(updates).length) {
      existing.set(updates);
      await existing.save();
    }
    return existing;
  }
  return Customer.create({ ...nonBlank(data as Record<string, unknown>), name });
}

/** Create the vendor if new; otherwise fill in only the details provided. */
export async function upsertVendor(data: { name: string; mobile?: string; gstin?: string; address?: string; quarryLocation?: string; contactPerson?: string; openingBalance?: number }) {
  const name = String(data.name ?? "").trim();
  if (!name) return null;
  const existing = await Vendor.findOne({ name: exactName(name) });
  if (existing) {
    const { name: _ignored, ...rest } = data;
    const updates = nonBlank(rest as Record<string, unknown>);
    if (Object.keys(updates).length) {
      existing.set(updates);
      await existing.save();
    }
    return existing;
  }
  return Vendor.create({ ...nonBlank(data as Record<string, unknown>), name });
}

/** Reject an invoice number already used by another bill (case-insensitive). */
export async function assertUniqueInvoiceNo(invoiceNo: string, excludeId?: string) {
  const filter: any = { invoiceNo: exactName(invoiceNo) };
  if (excludeId) filter._id = { $ne: excludeId };
  const dup = await Bill.findOne(filter).select("_id").lean();
  if (dup) throw new LedgerError(`Invoice number "${invoiceNo.trim()}" is already used by another bill`, 409);
}

/**
 * Increase the running number in a document number, keeping its zero padding.
 * The last number that is not a year is used: "PUR-2026-0001" -> "PUR-2026-0002",
 * "1/2026" -> "2/2026", "S-009" -> "S-010", "INV/2026-27/015" -> "INV/2026-27/016".
 */
export function incrementDocNumber(docNo: string) {
  const groups = [...docNo.matchAll(/\d+/g)];
  if (!groups.length) return `${docNo}-1`;
  const isYear = (g: RegExpMatchArray) => g[0].length === 4 && +g[0] >= 1900 && +g[0] <= 2100;
  const target = [...groups].reverse().find((g) => !isYear(g)) || groups[groups.length - 1];
  const start = target.index ?? 0;
  const next = String(parseInt(target[0], 10) + 1).padStart(target[0].length, "0");
  return docNo.slice(0, start) + next + docNo.slice(start + target[0].length);
}

/** Suggest the next free invoice number by incrementing the most recent bill's invoice no. */
export async function suggestNextInvoiceNo() {
  const last = await Bill.findOne().sort({ createdAt: -1 }).select("invoiceNo").lean();
  let candidate = last?.invoiceNo ? incrementDocNumber(last.invoiceNo) : `1/${new Date().getFullYear()}`;
  for (let i = 0; i < 50 && (await Bill.exists({ invoiceNo: exactName(candidate) })); i++) {
    candidate = incrementDocNumber(candidate);
  }
  return candidate;
}

/** Bill fields that always come from Settings → Company Profile & Invoice Header. */
export const BILL_HEADER_FIELDS = [
  "companyName",
  "companyGstin",
  "companyAddress",
  "companyMobile",
  "documentTitle",
  "copyLabel",
  "bankDetails",
  "termsAndConditions",
  "authorisedSignatoryText",
] as const;

/** Company header, bank details and terms for a new bill, taken from Settings. */
export async function billHeaderFromSettings() {
  const s = await CompanySettings.findOne().lean();
  return {
    companyName: s?.companyName || "",
    companyGstin: s?.companyGstin || "",
    companyAddress: s?.companyAddress || "",
    companyMobile: s?.companyMobile || "",
    documentTitle: s?.documentTitle || "BILL OF SUPPLY",
    copyLabel: s?.copyLabel || "Original Copy",
    bankDetails: {
      accountName: s?.bankAccountName || "",
      accountNumber: s?.bankAccountNumber || "",
      ifscCode: s?.bankIfsc || "",
      bankBranch: s?.bankBranch || "",
    },
    termsAndConditions: s?.termsAndConditions || [],
    authorisedSignatoryText: s?.authorisedSignatoryText || "",
  };
}

/** Turn a thrown error into a JSON response body + status for route handlers. */
export function errorResponse(error: any, fallback: string) {
  if (error instanceof LedgerError) return { body: { message: error.message }, status: error.status };
  if (error?.name === "ValidationError" || error?.name === "CastError") {
    return { body: { message: error.message }, status: 400 };
  }
  return { body: { message: error?.message || fallback }, status: 500 };
}
