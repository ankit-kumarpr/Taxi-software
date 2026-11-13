const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const documentSchema = new mongoose.Schema({
    url: { type: String, required: true },
    originalName: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const walletTransactionSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["CREDIT", "DEBIT"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    balanceAfter: {
        type: Number,
        required: true,
    },
    note: {
        type: String,
        trim: true,
        default: "",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: { createdAt: true, updatedAt: false } });

const vendorSchema = new mongoose.Schema({
    vendorId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    companyName: {
        type: String,
        required: true,
        trim: true,
    },
    vendorType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorType",
        required: true,
    },
    companyRegistrationNumber: { type: String, trim: true, default: "" },
    gstNumber: { type: String, trim: true, uppercase: true, default: "" },
    contactPersonName: { type: String, trim: true, default: "" },
    ownerName: { type: String, trim: true, default: "" },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
    },
    alternateContactNumber: { type: String, trim: true, default: "" },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
        default: null,
    },
    aadhaarNumber: { type: String, trim: true, default: "" },
    panNumber: { type: String, trim: true, uppercase: true, default: "" },

    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pinCode: { type: String, required: true, trim: true },
    country: { type: String, trim: true, default: "India" },

    bankAccountHolderName: { type: String, trim: true, default: "" },
    bankName: { type: String, trim: true, default: "" },
    bankAccountNumber: { type: String, trim: true, default: "" },
    ifscCode: { type: String, trim: true, uppercase: true, default: "" },
    cancelledCheque: { type: documentSchema, default: null },

    emergencyContactName: { type: String, trim: true, default: "" },
    emergencyContactRelationship: { type: String, trim: true, default: "" },
    emergencyContactNumber: { type: String, trim: true, default: "" },

    aadhaarDocument: { type: documentSchema, default: null },
    panDocument: { type: documentSchema, default: null },
    companyRegistrationDocument: { type: documentSchema, default: null },
    gstCertificate: { type: documentSchema, default: null },
    otherDocuments: { type: [documentSchema], default: [] },

    documentVerificationStatus: {
        type: String,
        enum: ["PENDING", "VERIFIED", "REJECTED"],
        default: "PENDING",
    },
    /** Last time a pending-documents reminder email was sent */
    documentReminderSentAt: {
        type: Date,
        default: null,
        index: true,
    },
    documentReminderCount: {
        type: Number,
        default: 0,
        min: 0,
    },

    /**
     * How this vendor does business with True Way.
     * FIXED = company takes companySharePercent of trip amount; rest to vendor.
     * BID   = bidding / first-accept flow (amount decided per trip later).
     * null  = not decided yet.
     */
    businessModel: {
        type: String,
        enum: ["FIXED", "BID"],
        default: null,
        index: true,
    },
    /** True Way company share out of 100 (only for FIXED). Vendor gets 100 - this. */
    companySharePercent: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
    },
    businessModelSetAt: {
        type: Date,
        default: null,
    },
    businessModelSetBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },

    vendorRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
    },
    walletBalance: {
        type: Number,
        default: 0,
        min: 0,
    },
    walletTransactions: {
        type: [walletTransactionSchema],
        default: [],
    },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE",
    },
    internalNotes: {
        type: String,
        trim: true,
        default: "",
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    /** Set when a driver self-upgrades to vendor */
    convertedFromDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null,
        index: true,
    },
}, { timestamps: true });

vendorSchema.index({ companyName: 1 });
vendorSchema.index({ mobileNumber: 1 });
vendorSchema.index({ vendorType: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ documentVerificationStatus: 1 });
vendorSchema.index({ city: 1, state: 1 });
vendorSchema.index({ createdAt: -1 });
vendorSchema.index({
    companyName: "text",
    email: "text",
    contactPersonName: "text",
    ownerName: "text",
    vendorId: "text",
});

vendorSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

vendorSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Vendor", vendorSchema);
