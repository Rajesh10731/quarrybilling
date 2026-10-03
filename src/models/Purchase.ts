import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPurchasePayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  date: string;
  mode: string;
  ref?: string;
  notes?: string;
  createdAt?: Date;
}

export interface IPurchase extends Document {
  inwardNo: string;
  date: string;
  time?: string;
  vendorId?: mongoose.Types.ObjectId;
  vendorName: string;
  vendorMobile?: string;
  vendorGstin?: string;
  vendorAddress?: string;
  vendorChallanNo?: string;
  ewayBillNo?: string;

  // Lorry / Transport details
  vehicleNo: string;
  transportName?: string;
  driverName?: string;
  driverMobile?: string;
  unloadingPoint?: string;

  // Material & Weight / Quantity
  material: string;
  hsnSac?: string;
  grossWeight?: number;
  tareWeight?: number;
  netWeight?: number;
  qty: number;
  unit: string;
  rate: number;
  materialAmount: number;
  lorryFreight?: number;
  freightPaidBy?: string;
  loadingCharges?: number;
  taxRate?: string;
  taxAmount?: number;
  otherCharges?: number;
  grandTotal: number;
  amountInWords?: string;

  // Payment Settlement
  paymentStatus: "UNPAID" | "PAID" | "PARTIAL";
  paidAmount: number;
  paymentMode?: "Cash" | "UPI" | "Bank Transfer" | "Cheque" | "Credit" | string;
  paymentRef?: string;
  paymentDate?: string;
  payments: IPurchasePayment[];
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PurchasePaymentSchema = new Schema<IPurchasePayment>(
  {
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: String, required: true },
    mode: { type: String, default: "Cash" },
    ref: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const PurchaseSchema = new Schema<IPurchase>(
  {
    inwardNo: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, default: "" },
    vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
    vendorName: { type: String, required: true, trim: true },
    vendorMobile: { type: String, default: "" },
    vendorGstin: { type: String, default: "" },
    vendorAddress: { type: String, default: "" },
    vendorChallanNo: { type: String, default: "" },
    ewayBillNo: { type: String, default: "" },

    // Lorry / Transport Details
    vehicleNo: { type: String, required: true, trim: true },
    transportName: { type: String, default: "" },
    driverName: { type: String, default: "" },
    driverMobile: { type: String, default: "" },
    unloadingPoint: { type: String, default: "" },

    // Material & Quantities
    material: { type: String, required: true, trim: true },
    hsnSac: { type: String, default: "" },
    grossWeight: { type: Number, default: 0 },
    tareWeight: { type: Number, default: 0 },
    netWeight: { type: Number, default: 0 },
    qty: { type: Number, required: true, default: 0 },
    unit: { type: String, default: "Tonne" },
    rate: { type: Number, required: true, default: 0 },
    materialAmount: { type: Number, required: true, default: 0 },
    lorryFreight: { type: Number, default: 0 },
    freightPaidBy: { type: String, default: "Paid by Us" },
    loadingCharges: { type: Number, default: 0 },
    taxRate: { type: String, default: "Exempt" },
    taxAmount: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    amountInWords: { type: String, default: "" },

    // Payment Settlement
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "PARTIAL"],
      default: "UNPAID",
    },
    paidAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "Cash" },
    paymentRef: { type: String, default: "" },
    paymentDate: { type: String, default: "" },
    // Every payment made to the vendor for this load; paidAmount/paymentStatus are derived from it
    payments: { type: [PurchasePaymentSchema], default: [] },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Purchase: Model<IPurchase> =
  mongoose.models.Purchase ||
  mongoose.model<IPurchase>("Purchase", PurchaseSchema);
