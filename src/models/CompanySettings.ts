import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICompanySettings extends Document {
  companyName: string;
  companyGstin: string;
  companyAddress: string;
  companyMobile: string;
  documentTitle: string;
  copyLabel: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
  termsAndConditions: string[];
  authorisedSignatoryText: string;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    companyName: { type: String, default: "" },
    companyGstin: { type: String, default: "" },
    companyAddress: { type: String, default: "" },
    companyMobile: { type: String, default: "" },
    documentTitle: { type: String, default: "BILL OF SUPPLY" },
    copyLabel: { type: String, default: "Original Copy" },
    bankAccountName: { type: String, default: "" },
    bankAccountNumber: { type: String, default: "" },
    bankIfsc: { type: String, default: "" },
    bankBranch: { type: String, default: "" },
    termsAndConditions: {
      type: [String],
      default: [],
    },
    authorisedSignatoryText: { type: String, default: "" },
  },
  { timestamps: true }
);

export const CompanySettings: Model<ICompanySettings> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettings>("CompanySettings", CompanySettingsSchema);
