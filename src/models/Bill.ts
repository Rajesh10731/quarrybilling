import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBillItem {
  sn: number;
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
  /** Purchase (inward load) this quantity was bought on, when the material is sold on directly */
  purchaseId?: mongoose.Types.ObjectId;
  inwardNo?: string;
}

export interface IBillParty {
  name: string;
  mobile: string;
  gstin: string;
  address: string;
}

export interface IBankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankBranch: string;
}

export interface IBill extends Document {
  invoiceNo: string;
  date: string;
  placeOfSupply: string;
  reverseCharge: string;
  grRrNo: string;
  transport: string;
  vehicleNo: string;
  station: string;
  deliveryPlace: string;
  loadingCharges: number;
  lorryFreight: number;
  companyName: string;
  companyGstin: string;
  companyAddress?: string;
  companyMobile?: string;
  documentTitle: string;
  copyLabel: string;
  billedTo: IBillParty;
  shippedTo: IBillParty;
  items: IBillItem[];
  totalQty: number;
  totalQtyUnit: string;
  taxRate: string;
  taxableAmount: number;
  discountType?: "NONE" | "PERCENT" | "AMOUNT";
  discountValue?: number;
  discountAmount?: number;
  igstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  bankDetails: IBankDetails;
  termsAndConditions: string[];
  authorisedSignatoryText: string;
  paymentStatus?: "UNPAID" | "PAID" | "PARTIAL";
  paidAmount?: number;
  paymentDate?: string;
  paymentNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BillItemSchema = new Schema<IBillItem>({
  sn: { type: Number, required: true },
  description: { type: String, required: true },
  hsnSac: { type: String, default: "" },
  qty: { type: Number, required: true },
  unit: { type: String, default: "Tonne" },
  price: { type: Number, required: true },
  amount: { type: Number, required: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
  inwardNo: { type: String, default: "" },
});

const BillPartySchema = new Schema<IBillParty>({
  name: { type: String, default: "" },
  mobile: { type: String, default: "" },
  gstin: { type: String, default: "" },
  address: { type: String, default: "" },
});

const BankDetailsSchema = new Schema<IBankDetails>({
  accountName: { type: String, default: "" },
  accountNumber: { type: String, default: "" },
  ifscCode: { type: String, default: "" },
  bankBranch: { type: String, default: "" },
});

const BillSchema = new Schema<IBill>(
  {
    invoiceNo: { type: String, required: true },
    date: { type: String, required: true },
    placeOfSupply: { type: String, default: "" },
    reverseCharge: { type: String, default: "N" },
    grRrNo: { type: String, default: "" },
    transport: { type: String, default: "" },
    vehicleNo: { type: String, default: "" },
    station: { type: String, default: "" },
    deliveryPlace: { type: String, default: "" },
    loadingCharges: { type: Number, default: 0 },
    lorryFreight: { type: Number, default: 0 },
    companyName: { type: String, default: "" },
    companyGstin: { type: String, default: "" },
    companyAddress: { type: String, default: "" },
    companyMobile: { type: String, default: "" },
    documentTitle: { type: String, default: "BILL OF SUPPLY" },
    copyLabel: { type: String, default: "Original Copy" },
    billedTo: { type: BillPartySchema, required: true },
    shippedTo: { type: BillPartySchema, required: true },
    items: { type: [BillItemSchema], required: true },
    totalQty: { type: Number, default: 0 },
    totalQtyUnit: { type: String, default: "Tonne" },
    taxRate: { type: String, default: "Exempt" },
    taxableAmount: { type: Number, required: true },
    // Discount on the material amount, given as a % or a fixed ₹ amount; GST is charged after it
    discountType: { type: String, enum: ["NONE", "PERCENT", "AMOUNT"], default: "NONE" },
    discountValue: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    igstAmount: { type: Number, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    amountInWords: { type: String, required: true },
    bankDetails: { type: BankDetailsSchema, required: true },
    termsAndConditions: { type: [String], default: [] },
    authorisedSignatoryText: { type: String, default: "" },
    paymentStatus: { type: String, enum: ["UNPAID", "PAID", "PARTIAL"], default: "UNPAID" },
    paidAmount: { type: Number, default: 0 },
    paymentDate: { type: String, default: "" },
    paymentNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Bill: Model<IBill> =
  mongoose.models.Bill || mongoose.model<IBill>("Bill", BillSchema);
