import mongoose from "mongoose";
import { Bill } from "@/models/Bill";
import { Purchase } from "@/models/Purchase";
import { LedgerError, round2 } from "@/lib/ledger";

/**
 * Back-to-back trading: the owner buys a load (purchase / inward) and sells that same
 * load to a customer without keeping stock. Sales bill items point to the purchase they
 * came from, and a purchase can never be sold for more than the quantity bought.
 */

export interface PurchaseSale {
  billId: string;
  invoiceNo: string;
  date: string;
  customer: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
  // Bill-level figures, used to give this line its share of the bill's discount and charges
  billMaterial?: number;
  discountAmount?: number;
  loadingCharges?: number;
  lorryFreight?: number;
}

export interface PurchaseSoldSummary {
  soldQty: number;
  soldValue: number;
  sales: PurchaseSale[];
}

const TOLERANCE = 0.005;

/** How much of each purchase has been sold, and on which invoices. */
export async function purchaseSales(
  purchaseIds?: (string | mongoose.Types.ObjectId)[],
  excludeBillId?: string
): Promise<Map<string, PurchaseSoldSummary>> {
  const match: Record<string, unknown> = { "items.purchaseId": { $ne: null } };
  if (purchaseIds) match["items.purchaseId"] = { $in: purchaseIds.map((id) => new mongoose.Types.ObjectId(String(id))) };

  const pipeline: mongoose.PipelineStage[] = [];
  if (excludeBillId && mongoose.isValidObjectId(excludeBillId)) {
    pipeline.push({ $match: { _id: { $ne: new mongoose.Types.ObjectId(excludeBillId) } } });
  }
  pipeline.push(
    { $addFields: { billMaterial: { $sum: "$items.amount" } } },
    { $unwind: "$items" },
    { $match: match },
    { $sort: { date: 1, createdAt: 1 } },
    {
      $group: {
        _id: "$items.purchaseId",
        soldQty: { $sum: "$items.qty" },
        soldValue: { $sum: "$items.amount" },
        sales: {
          $push: {
            billId: "$_id",
            invoiceNo: "$invoiceNo",
            date: "$date",
            customer: "$billedTo.name",
            qty: "$items.qty",
            unit: "$items.unit",
            rate: "$items.price",
            amount: "$items.amount",
            billMaterial: "$billMaterial",
            discountAmount: { $ifNull: ["$discountAmount", 0] },
            loadingCharges: { $ifNull: ["$loadingCharges", 0] },
            lorryFreight: { $ifNull: ["$lorryFreight", 0] },
          },
        },
      },
    }
  );

  const rows = await Bill.aggregate(pipeline);
  const map = new Map<string, PurchaseSoldSummary>();
  for (const r of rows) {
    map.set(String(r._id), {
      soldQty: round2(r.soldQty),
      soldValue: round2(r.soldValue),
      sales: r.sales.map((s: any) => ({ ...s, billId: String(s.billId) })),
    });
  }
  return map;
}

/** Sold / remaining figures for one purchase. */
export function soldStatus(purchase: { qty?: number }, summary?: PurchaseSoldSummary) {
  const qty = purchase.qty || 0;
  const soldQty = summary?.soldQty || 0;
  const remainingQty = round2(Math.max(0, qty - soldQty));
  const saleStatus = soldQty <= TOLERANCE ? "NOT_SOLD" : remainingQty <= TOLERANCE ? "SOLD" : "PARTLY_SOLD";
  return { soldQty, remainingQty, soldValue: summary?.soldValue || 0, saleStatus };
}

export interface PurchaseCostFields {
  qty?: number;
  materialAmount?: number;
  lorryFreight?: number;
  freightPaidBy?: string;
  loadingCharges?: number;
  otherCharges?: number;
}

/**
 * Trade margin of one purchase load, on the quantity sold so far (GST left out, it is passed on):
 *   income = material sold − its share of the bill discount + its share of the bill's loading / lorry charges
 *            (a bill's discount and charges are split across its lines by line amount)
 *   cost   = (material bought + loading + other charges + freight if "Paid by Us") ÷ qty bought × qty sold
 */
export function tradeMargin(purchase: PurchaseCostFields, summary?: PurchaseSoldSummary) {
  const qty = purchase.qty || 0;
  const freight = purchase.freightPaidBy === "Paid by Us" ? purchase.lorryFreight || 0 : 0;
  const buyCharges = (purchase.loadingCharges || 0) + (purchase.otherCharges || 0) + freight;
  const materialUnitCost = qty ? (purchase.materialAmount || 0) / qty : 0;
  const unitCost = qty ? ((purchase.materialAmount || 0) + buyCharges) / qty : 0;

  const sales = (summary?.sales || []).map((s) => {
    const share = (s.billMaterial || 0) > 0 ? s.amount / (s.billMaterial || 0) : 0;
    const discountShare = round2((s.discountAmount || 0) * share);
    const chargesShare = round2(((s.loadingCharges || 0) + (s.lorryFreight || 0)) * share);
    const income = round2(s.amount - discountShare + chargesShare);
    const cost = round2(unitCost * s.qty);
    return { ...s, discountShare, chargesShare, income, cost, profit: round2(income - cost) };
  });

  const sum = (pick: (s: (typeof sales)[number]) => number) => round2(sales.reduce((t, s) => t + pick(s), 0));
  const soldQty = summary?.soldQty || 0;
  const materialSold = sum((s) => s.amount);
  const discount = sum((s) => s.discountShare);
  const chargesBilled = sum((s) => s.chargesShare);
  const income = round2(materialSold - discount + chargesBilled);
  const materialCost = round2(materialUnitCost * soldQty);
  const cost = round2(unitCost * soldQty);
  const profit = round2(income - cost);
  return {
    materialSold,
    discount,
    chargesBilled,
    income,
    materialCost,
    chargesCost: round2(cost - materialCost),
    cost,
    profit,
    marginPct: income > 0 ? Math.round((profit / income) * 1000) / 10 : 0,
    sales,
  };
}

export type TradeMargin = ReturnType<typeof tradeMargin>;

/**
 * Check the purchase links on a bill's items before saving:
 * the purchase exists, the unit matches, and the quantity sold (across all bills) stays
 * within the quantity bought. Also stores the inward no. on each linked item.
 */
export async function validateBillSourcing(items: any[], excludeBillId?: string) {
  if (!Array.isArray(items)) return;
  const linked = items.filter((it) => it?.purchaseId);
  for (const it of items) if (!it?.purchaseId) { delete it.purchaseId; it.inwardNo = ""; }
  if (!linked.length) return;

  for (const it of linked) {
    if (!mongoose.isValidObjectId(it.purchaseId)) throw new LedgerError("Invalid purchase reference on a bill item");
  }
  const ids = [...new Set(linked.map((it) => String(it.purchaseId)))];
  const purchases = await Purchase.find({ _id: { $in: ids } }).select("inwardNo qty unit material").lean();
  const byId = new Map(purchases.map((p) => [String(p._id), p]));
  const soldElsewhere = await purchaseSales(ids, excludeBillId);

  const onThisBill = new Map<string, number>();
  for (const it of linked) {
    const p = byId.get(String(it.purchaseId));
    if (!p) throw new LedgerError(`The purchase linked to "${it.description}" no longer exists`);
    if ((it.unit || "Tonne") !== (p.unit || "Tonne")) {
      throw new LedgerError(`${it.description}: unit must be ${p.unit} to match purchase ${p.inwardNo}`);
    }
    it.inwardNo = p.inwardNo;
    onThisBill.set(String(p._id), round2((onThisBill.get(String(p._id)) || 0) + (Number(it.qty) || 0)));
  }

  for (const [id, qty] of onThisBill) {
    const p = byId.get(id)!;
    const available = round2((p.qty || 0) - (soldElsewhere.get(id)?.soldQty || 0));
    if (qty > available + TOLERANCE) {
      throw new LedgerError(
        available > TOLERANCE
          ? `Purchase ${p.inwardNo} has only ${available} ${p.unit} left to sell (this bill has ${qty})`
          : `Purchase ${p.inwardNo} is already fully sold`,
        409
      );
    }
  }
}

/** Purchases that still have quantity left to sell (for the bill form). */
export async function purchasesAvailableForSale(excludeBillId?: string) {
  const purchases = await Purchase.find()
    .sort({ date: -1, createdAt: -1 })
    .select("inwardNo date vendorName vehicleNo transportName material hsnSac qty unit rate")
    .lean();
  const sold = await purchaseSales(undefined, excludeBillId);
  return purchases
    .map((p) => ({ ...p, ...soldStatus(p, sold.get(String(p._id))) }))
    .filter((p) => p.remainingQty > TOLERANCE);
}
