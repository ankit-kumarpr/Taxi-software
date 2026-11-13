const mongoose = require("mongoose");

/**
 * Singleton company profile used on quotations (letterhead).
 */
const companyProfileSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: "default",
            unique: true,
            immutable: true,
        },
        companyName: {
            type: String,
            required: true,
            trim: true,
            default: "True Way Taxi",
        },
        addressLine1: { type: String, trim: true, default: "" },
        addressLine2: { type: String, trim: true, default: "" },
        city: { type: String, trim: true, default: "" },
        state: { type: String, trim: true, default: "" },
        pinCode: { type: String, trim: true, default: "" },
        landmark: { type: String, trim: true, default: "" },
        gstin: { type: String, trim: true, uppercase: true, default: "" },
        gstPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 5,
        },
        /**
         * Default company share % for FIXED vendors.
         * Used when applying to all FIXED vendors / new FIXED deals without custom %.
         */
        defaultFixedCompanySharePercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 20,
        },
        quotationPhone: { type: String, trim: true, default: "" },
        quotationEmail: { type: String, trim: true, lowercase: true, default: "" },
        logo: {
            url: { type: String, default: null },
            originalName: { type: String, default: "" },
            mimeType: { type: String, default: "" },
            size: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: null },
        },
        /** Full-width boarding-pass style banner on quotation PDF */
        quotationHeaderImage: {
            url: { type: String, default: null },
            originalName: { type: String, default: "" },
            mimeType: { type: String, default: "" },
            size: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: null },
        },
        bankName: { type: String, trim: true, default: "" },
        accountNumber: { type: String, trim: true, default: "" },
        ifsc: { type: String, trim: true, uppercase: true, default: "" },
        accountHolderName: { type: String, trim: true, default: "" },
        /** Comma or newline separated UPI IDs */
        upiIds: { type: String, trim: true, default: "" },
        paymentQrImage: {
            url: { type: String, default: null },
            originalName: { type: String, default: "" },
            mimeType: { type: String, default: "" },
            size: { type: Number, default: 0 },
            uploadedAt: { type: Date, default: null },
        },
        paymentWarningText: {
            type: String,
            trim: true,
            default:
                "Make the payment immediately after ride completion via the link only, ignore if already paid. (* Don't pay any CASH to the driver *)",
        },
        termsAndConditions: {
            type: String,
            trim: true,
            default: "",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
