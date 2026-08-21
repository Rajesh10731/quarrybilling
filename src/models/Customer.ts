import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICustomer extends Document {
  name: string;
  mobile: string;
  gstin: string;
  address: string;
  deliveryPlace: string;
  openingBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, default: "" },
    gstin: { type: String, default: "" },
    address: { type: String, default: "" },
    deliveryPlace: { type: String, default: "" },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema);
