const mongoose = require("mongoose");

const QUOTATION_STATUSES = ["DRAFT", "SENT"];

const companySnapshotSchema = new mongoose.Schema(
    {
        companyName: { type: String, default: "" },
        addressLine1: { type: String, default: "" },
        addressLine2: { type: String, default: "" },
        city: { type: String, default: "" },
        state: { type: String, default: "" },
        pinCode: { type: String, default: "" },
        landmark: { type: String, default: "" },
        gstin: { type: String, default: "" },
        gstPercent: { type: Number, default: 0 },
        quotationPhone: { type: String, default: "" },
        quotationEmail: { type: String, default: "" },
        logoUrl: { type: String, default: null },
        quotationHeaderImageUrl: { type: String, default: null },
        bankName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifsc: { type: String, default: "" },
        accountHolderName: { type: String, default: "" },
        upiIds: { type: String, default: "" },
        paymentQrImageUrl: { type: String, default: null },
        paymentWarningText: { type: String, default: "" },
        termsAndConditions: { type: String, default: "" },
    },
    { _id: false }
);

const quotationSchema = new mongoose.Schema(
    {
        quotationId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true,
            index: true,
        },
        company: {
            type: companySnapshotSchema,
            default: () => ({}),
        },
        customerName: { type: String, required: true, trim: true },
        mobileNumber: { type: String, required: true, trim: true },
        email: { type: String, trim: true, lowercase: true, default: "" },
        pickupLocation: { type: String, required: true, trim: true },
        dropLocation: { type: String, required: true, trim: true },
        travelDate: { type: Date, required: true },
        endDate: { type: Date, default: null },
        pickupTime: { type: String, required: true, trim: true },
        tripTypeName: { type: String, trim: true, default: "" },
        cabTypeName: { type: String, trim: true, default: "" },
        tripAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        gstPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        gstAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        grandTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
            default: "Valid for 48 hours from quotation date.",
        },
        status: {
            type: String,
            enum: QUOTATION_STATUSES,
            default: "DRAFT",
            index: true,
        },
        pdfUrl: {
            type: String,
            default: null,
        },
        sentVia: {
            type: [
                {
                    type: String,
                    enum: ["WHATSAPP", "EMAIL"],
                },
            ],
            default: [],
        },
        sentAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

quotationSchema.index({ createdAt: -1 });
quotationSchema.index({ quotationId: "text", customerName: "text", mobileNumber: "text" });

module.exports = mongoose.model("Quotation", quotationSchema);
module.exports.QUOTATION_STATUSES = QUOTATION_STATUSES;
