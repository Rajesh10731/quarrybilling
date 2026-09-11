import mongoose, { Schema, Document, Model } from "mongoose";

export interface IVendor extends Document {
  name: string;
  mobile: string;
  gstin: string;
  address: string;
  quarryLocation: string;
  contactPerson: string;
  openingBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: "" },
    gstin: { type: String, default: "" },
    address: { type: String, default: "" },
    quarryLocation: { type: String, default: "" },
    contactPerson: { type: String, default: "" },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Vendor: Model<IVendor> =
  mongoose.models.Vendor || mongoose.model<IVendor>("Vendor", VendorSchema);
