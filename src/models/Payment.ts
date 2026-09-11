import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPayment extends Document {
  paymentNumber: string; // e.g., REC-202609-0001
  date: string;          // YYYY-MM-DD
  customerId?: mongoose.Types.ObjectId;
  customerName: string;
  billId?: mongoose.Types.ObjectId;
  invoiceNo?: string;
  billGrandTotal?: number;
  amount: number;        // e.g. 10000 or 90000
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Cheque" | "Other";
  referenceNo?: string;  // UPI ref / Cheque no / Bank UTR
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    date: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    customerName: { type: String, required: true, trim: true },
    billId: { type: Schema.Types.ObjectId, ref: "Bill" },
    invoiceNo: { type: String, default: "" },
    billGrandTotal: { type: Number, default: 0 },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMode: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Other"],
      default: "Cash",
    },
    referenceNo: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
