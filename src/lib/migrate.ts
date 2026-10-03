import mongoose from "mongoose";
import { Bill } from "@/models/Bill";
import { Payment } from "@/models/Payment";
import { Purchase } from "@/models/Purchase";
import { recalcBill, recordPayment, round2 } from "@/lib/ledger";
import { syncPurchasePayments } from "@/lib/purchases";

/**
 * One-time, idempotent clean-up of data written by older versions of the app.
 * Safe to run on every start: each step only touches records that still need it.
 */
export async function migrateLegacyData() {
  const db = mongoose.connection.db;
  if (!db) return;

  // 1. Store every date as YYYY-MM-DD (older records used DD-MM-YYYY).
  const ddmmyyyy = /^\d{2}-\d{2}-\d{4}$/;
  const toIso = (field: string) => ({
    $concat: [{ $substrCP: [`$${field}`, 6, 4] }, "-", { $substrCP: [`$${field}`, 3, 2] }, "-", { $substrCP: [`$${field}`, 0, 2] }],
  });
  const dateFields: Record<string, string[]> = {
    bills: ["date", "paymentDate"],
    purchases: ["date", "paymentDate"],
    payments: ["date"],
    lorrybills: ["date", "paymentDate"],
  };
  for (const [collection, fields] of Object.entries(dateFields)) {
    for (const field of fields) {
      await db.collection(collection).updateMany({ [field]: { $regex: ddmmyyyy } }, [{ $set: { [field]: toIso(field) } }]);
    }
  }

  // 2. Purchases: turn an old single "paidAmount" into the first entry of the payment history.
  const legacyPurchases = await Purchase.find({ paidAmount: { $gt: 0 }, $or: [{ payments: { $exists: false } }, { payments: { $size: 0 } }] });
  for (const p of legacyPurchases) {
    p.payments.push({
      amount: round2(Math.min(p.paidAmount, p.grandTotal || p.paidAmount)),
      date: p.paymentDate || p.date,
      mode: p.paymentMode || "Cash",
      ref: p.paymentRef || "",
      notes: "Carried over from earlier payment record",
    });
    syncPurchasePayments(p);
    await p.save();
  }
  // Purchases whose saved status contradicts their paid amount
  const purchases = await Purchase.find({}).select("paidAmount grandTotal paymentStatus payments paymentDate paymentMode paymentRef");
  for (const p of purchases) {
    const before = `${p.paymentStatus}|${p.paidAmount}`;
    syncPurchasePayments(p);
    if (`${p.paymentStatus}|${p.paidAmount}` !== before) await p.save();
  }

  // 3. Bills marked PAID / PARTIAL with the old status buttons but no receipts: record the
  //    implied amount as a receipt so every screen counts the same money.
  const bills = await Bill.find({ paymentStatus: { $in: ["PAID", "PARTIAL"] } });
  for (const bill of bills) {
    const receipts = await Payment.find({ billId: bill._id }).select("amount").lean();
    const recorded = round2(receipts.reduce((s, r) => s + (r.amount || 0), 0));
    const implied = bill.paymentStatus === "PAID" ? bill.grandTotal || 0 : bill.paidAmount || 0;
    const missing = round2(implied - recorded);
    if (missing > 0.005) {
      await recordPayment({
        billId: bill._id,
        customerName: bill.billedTo?.name || "Customer",
        amount: missing,
        date: bill.paymentDate || bill.date,
        paymentMode: "Other",
        notes: `Carried over from earlier "${bill.paymentStatus}" status`,
      });
    } else {
      await recalcBill(bill._id);
    }
  }

  // 4. Bills whose saved status no longer matches their receipts (e.g. reset by an old edit form)
  const billIdsWithReceipts = await Payment.distinct("billId", { billId: { $ne: null } });
  for (const billId of billIdsWithReceipts) {
    await recalcBill(billId);
  }
}
