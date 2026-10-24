import { Quotation, IQuotation } from "@/models/Quotation";
import { Bill } from "@/models/Bill";
import { CompanySettings } from "@/models/CompanySettings";
import { numberToWords } from "@/lib/utils";
import { computeBillTotals } from "@/lib/billTotals";
import {
  LedgerError,
  billHeaderFromSettings,
  exactName,
  nextMonthlyDocNo,
  recalcBill,
  round2,
  suggestNextInvoiceNo,
  toISODate,
  todayISO,
  upsertCustomer,
} from "@/lib/ledger";

const TAX_RATES = ["Exempt", "5%", "12%", "18%"];
const UNITS = ["Tonne", "CFT", "Trips", "Kg", "Nos", "Load"];

/** Statuses a user may set by hand; CONVERTED is only set by converting to a bill. */
export const MANUAL_STATUSES = ["OPEN", "ACCEPTED", "REJECTED"] as const;

/** Days a quotation stays valid when no "valid until" date is given. */
export const DEFAULT_VALIDITY_DAYS = 15;

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

const isISODate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(`${s}T00:00:00Z`).getTime());

/**
 * Validate a quotation from the form and compute every money field on the server
 * (same rule as sales bills: items + GST on items + loading + freight).
 */
export function buildQuotationFields(body: any) {
  const num = (v: unknown) => Number(v) || 0;
  const text = (v: unknown) => String(v ?? "").trim();

  const quotationNo = text(body.quotationNo);
  if (!quotationNo) throw new LedgerError("Quotation number is required");

  const date = toISODate(body.date) || todayISO();
  if (!isISODate(date)) throw new LedgerError("Quotation date is not a valid date");
  const validUntil = toISODate(body.validUntil) || addDays(date, DEFAULT_VALIDITY_DAYS);
  if (!isISODate(validUntil)) throw new LedgerError("Valid-until date is not a valid date");
  if (validUntil < date) throw new LedgerError("Valid-until date cannot be before the quotation date");

  const customerName = text(body.customer?.name);
  if (!customerName) throw new LedgerError("Customer name is required");

  const rawItems: any[] = Array.isArray(body.items) ? body.items : [];
  const items = rawItems
    .filter((it) => text(it?.description) || num(it?.qty) || num(it?.price))
    .map((it, i) => {
      const description = text(it.description);
      const qty = num(it.qty);
      const price = num(it.price);
      if (!description) throw new LedgerError(`Item ${i + 1}: description is required`);
      if (!(qty > 0)) throw new LedgerError(`Item ${i + 1} (${description}): quantity must be greater than 0`);
      if (price < 0) throw new LedgerError(`Item ${i + 1} (${description}): rate cannot be negative`);
      return {
        sn: i + 1,
        description,
        hsnSac: text(it.hsnSac),
        qty: round2(qty),
        unit: UNITS.includes(it.unit) ? it.unit : "Tonne",
        price: round2(price),
        amount: round2(qty * price),
      };
    });
  if (!items.length) throw new LedgerError("Add at least one item to the quotation");

  const loadingCharges = round2(num(body.loadingCharges));
  const lorryFreight = round2(num(body.lorryFreight));
  if (loadingCharges < 0 || lorryFreight < 0) throw new LedgerError("Charges cannot be negative");

  const taxRate = TAX_RATES.includes(body.taxRate) ? body.taxRate : "Exempt";
  // Same money rules as sales bills (discount on material, GST after discount, then charges)
  const totals = computeBillTotals({ items, taxRate, loadingCharges, lorryFreight, discountType: body.discountType, discountValue: body.discountValue });
  if (totals.error) throw new LedgerError(totals.error);
  const { taxableAmount, discountType, discountValue, discountAmount, totalTax, grandTotal } = totals;

  const termsAndConditions: string[] = (Array.isArray(body.termsAndConditions) ? body.termsAndConditions : String(body.termsAndConditions ?? "").split("\n"))
    .map((t: unknown) => text(t))
    .filter(Boolean);

  return {
    quotationNo,
    date,
    validUntil,
    customer: {
      name: customerName,
      mobile: text(body.customer?.mobile),
      gstin: text(body.customer?.gstin),
      address: text(body.customer?.address),
    },
    deliveryPlace: text(body.deliveryPlace),
    items,
    totalQty: round2(items.reduce((s, it) => s + it.qty, 0)),
    loadingCharges,
    lorryFreight,
    taxRate,
    taxableAmount,
    discountType,
    discountValue,
    discountAmount,
    totalTax,
    grandTotal,
    amountInWords: numberToWords(grandTotal),
    notes: text(body.notes),
    termsAndConditions,
  };
}

/** Reject a quotation number already used by another quotation (case-insensitive). */
export async function assertUniqueQuotationNo(quotationNo: string, excludeId?: string) {
  const filter: any = { quotationNo: exactName(quotationNo) };
  if (excludeId) filter._id = { $ne: excludeId };
  if (await Quotation.exists(filter)) {
    throw new LedgerError(`Quotation number "${quotationNo}" is already used`, 409);
  }
}

/** Suggest the next free quotation number for a quotation dated `date`, e.g. QUO-2026-01-001. */
export async function suggestNextQuotationNo(date?: string) {
  return nextMonthlyDocNo(Quotation, "quotationNo", "QUO", date);
}

/** Company letterhead details copied onto a new quotation. */
export async function companySnapshot() {
  const s = await CompanySettings.findOne().lean();
  return {
    companyName: s?.companyName || "",
    companyGstin: s?.companyGstin || "",
    companyAddress: s?.companyAddress || "",
    companyMobile: s?.companyMobile || "",
    authorisedSignatoryText: s?.authorisedSignatoryText || "",
  };
}

/** Status to show: an OPEN quotation past its valid-until date is EXPIRED. */
export function displayStatus(q: Pick<IQuotation, "status" | "validUntil">) {
  return q.status === "OPEN" && q.validUntil && q.validUntil < todayISO() ? "EXPIRED" : q.status;
}

/**
 * Create a sales bill from a quotation: same customer, items, charges and GST, the
 * next free invoice number and today's date. The customer is saved at this point.
 */
export async function convertQuotationToBill(quotation: IQuotation, opts: { invoiceNo?: string; date?: string; vehicleNo?: string }) {
  if (quotation.status === "CONVERTED") {
    throw new LedgerError(`Already converted to invoice ${quotation.convertedInvoiceNo || ""}`.trim(), 409);
  }
  if (quotation.status === "REJECTED") {
    throw new LedgerError("A rejected quotation cannot be converted. Reopen it first.");
  }

  const invoiceNo = String(opts.invoiceNo || "").trim() || (await suggestNextInvoiceNo(opts.date));
  if (await Bill.exists({ invoiceNo: exactName(invoiceNo) })) {
    throw new LedgerError(`Invoice number "${invoiceNo}" is already used by another bill`, 409);
  }

  const party = {
    name: quotation.customer.name,
    mobile: quotation.customer.mobile,
    gstin: quotation.customer.gstin,
    address: quotation.customer.address,
  };

  await upsertCustomer({ ...party, deliveryPlace: quotation.deliveryPlace });

  const bill = await Bill.create({
    // Company header, bank details and terms from Settings (same as bills made from the form)
    ...(await billHeaderFromSettings()),
    invoiceNo,
    date: toISODate(opts.date) || todayISO(),
    vehicleNo: String(opts.vehicleNo || "").trim(),
    deliveryPlace: quotation.deliveryPlace,
    loadingCharges: quotation.loadingCharges,
    lorryFreight: quotation.lorryFreight,
    billedTo: party,
    shippedTo: party,
    items: quotation.items.map((it) => ({
      sn: it.sn,
      description: it.description,
      hsnSac: it.hsnSac,
      qty: it.qty,
      unit: it.unit,
      price: it.price,
      amount: it.amount,
    })),
    totalQty: quotation.totalQty,
    totalQtyUnit: quotation.items[0]?.unit || "Tonne",
    taxRate: quotation.taxRate,
    taxableAmount: quotation.taxableAmount,
    discountType: quotation.discountType || "NONE",
    discountValue: quotation.discountValue || 0,
    discountAmount: quotation.discountAmount || 0,
    totalTax: quotation.totalTax,
    grandTotal: quotation.grandTotal,
    amountInWords: quotation.amountInWords || numberToWords(quotation.grandTotal),
    paymentStatus: "UNPAID",
    paidAmount: 0,
  });

  quotation.status = "CONVERTED";
  quotation.convertedBillId = bill._id;
  quotation.convertedInvoiceNo = bill.invoiceNo;
  await quotation.save();

  return recalcBill(bill._id);
}
