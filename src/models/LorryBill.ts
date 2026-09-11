import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILorryBill extends Document {
  lorryBillNo: string;
  date: string;
  vehicleNo: string;
  customerName: string;
  material: string;
  rate: number;
  qty: number;
  unit: string;
  amount: number;
  loadingCharges: number;
  lorryFreight: number;
  total: number;
  deliveryPlace: string;
  notes: string;
  paymentStatus: "UNPAID" | "PAID" | "PARTIAL";
  paidAmount: number;
  paymentDate: string;
  createdAt: Date;
  updatedAt: Date;
}

const LorryBillSchema = new Schema<ILorryBill>(
  {
    lorryBillNo: { type: String, required: true },
    date: { type: String, required: true },
    vehicleNo: { type: String, default: "" },
    customerName: { type: String, default: "" },
    material: { type: String, default: "" },
    rate: { type: Number, default: 0 },
    qty: { type: Number, default: 0 },
    unit: { type: String, default: "Tonne" },
    amount: { type: Number, default: 0 },
    loadingCharges: { type: Number, default: 0 },
    lorryFreight: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    deliveryPlace: { type: String, default: "" },
    notes: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "PARTIAL"],
      default: "UNPAID",
    },
    paidAmount: { type: Number, default: 0 },
    paymentDate: { type: String, default: "" },
  },
  { timestamps: true }
);

export const LorryBill: Model<ILorryBill> =
  mongoose.models.LorryBill ||
  mongoose.model<ILorryBill>("LorryBill", LorryBillSchema);
