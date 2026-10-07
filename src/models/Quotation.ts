import mongoose, { Schema, Document, Model } from "mongoose";

export type QuotationStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "CONVERTED";

export interface IQuotationItem {
  sn: number;
  description: string;
  hsnSac: string;
  qty: number;
  unit: string;
  price: number;
  amount: number;
}

export interface IQuotationParty {
  name: string;
  mobile: string;
  gstin: string;
  address: string;
}

export interface IQuotation extends Document {
  quotationNo: string;
  date: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  // Company details captured when the quotation is created (like bills)
  companyName: string;
  companyGstin: string;
  companyAddress: string;
  companyMobile: string;
  authorisedSignatoryText: string;
  customer: IQuotationParty;
  deliveryPlace: string;
  items: IQuotationItem[];
  totalQty: number;
  loadingCharges: number;
  lorryFreight: number;
  taxRate: string;
  taxableAmount: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  notes: string;
  termsAndConditions: string[];
  status: QuotationStatus;
  convertedBillId?: mongoose.Types.ObjectId;
  convertedInvoiceNo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuotationItemSchema = new Schema<IQuotationItem>({
  sn: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  hsnSac: { type: String, default: "" },
  qty: { type: Number, required: true, min: 0 },
  unit: { type: String, default: "Tonne" },
  price: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
});

const QuotationPartySchema = new Schema<IQuotationParty>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: "" },
    gstin: { type: String, default: "" },
    address: { type: String, default: "" },
  },
  { _id: false }
);

const QuotationSchema = new Schema<IQuotation>(
  {
    quotationNo: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    validUntil: { type: String, required: true },
    companyName: { type: String, default: "" },
    companyGstin: { type: String, default: "" },
    companyAddress: { type: String, default: "" },
    companyMobile: { type: String, default: "" },
    authorisedSignatoryText: { type: String, default: "" },
    customer: { type: QuotationPartySchema, required: true },
    deliveryPlace: { type: String, default: "" },
    items: { type: [QuotationItemSchema], required: true },
    totalQty: { type: Number, default: 0 },
    loadingCharges: { type: Number, default: 0, min: 0 },
    lorryFreight: { type: Number, default: 0, min: 0 },
    taxRate: { type: String, default: "Exempt" },
    taxableAmount: { type: Number, required: true },
    totalTax: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    amountInWords: { type: String, default: "" },
    notes: { type: String, default: "" },
    termsAndConditions: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["OPEN", "ACCEPTED", "REJECTED", "CONVERTED"],
      default: "OPEN",
    },
    convertedBillId: { type: Schema.Types.ObjectId, ref: "Bill" },
    convertedInvoiceNo: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Quotation: Model<IQuotation> =
  mongoose.models.Quotation || mongoose.model<IQuotation>("Quotation", QuotationSchema);
