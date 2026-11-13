const mongoose = require("mongoose");

const LEAD_SOURCES = ["CALLS", "WHATSAPP", "META", "WEBSITE", "EMAIL", "DIRECT"];
const LEAD_STATUSES = [
    "PENDING",
    "NEW",
    "FOLLOW_UP",
    "QUOTATION_SEND",
    "CONFIRMED",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "DRIVER_ASSIGNED",
    "TRIP_STARTED",
    "PAYMENT_PENDING",
    "COMPLETED",
    "LOST",
    "CANCELLED",
];

const PAYMENT_METHODS = ["CASH", "RAZORPAY", "QR"];
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];
/** Lead-level collection status (advance / full) */
const LEAD_PAYMENT_STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID"];
const ADDRESS_PROOF_TYPES = ["AADHAAR", "PAN", "DL", "VOTER", "PASSPORT", "OTHER"];

const addressProofDocSchema = new mongoose.Schema(
    {
        url: { type: String, required: true },
        originalName: { type: String, default: "" },
        mimeType: { type: String, default: "" },
        size: { type: Number, default: 0 },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const followUpSchema = new mongoose.Schema({
    followUpDate: {
        type: Date,
        required: true,
    },
    followUpTime: {
        type: String,
        required: true,
        trim: true,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
    method: {
        type: String,
        enum: PAYMENT_METHODS,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: PAYMENT_STATUSES,
        default: "PAID",
    },
    purpose: {
        type: String,
        enum: ["ADVANCE", "FINAL", "OTHER"],
        default: "OTHER",
    },
    reference: {
        type: String,
        trim: true,
        default: "",
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    note: { type: String, trim: true, default: "" },
    paidAt: { type: Date, default: Date.now },
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "payments.recordedByModel",
    },
    recordedByModel: {
        type: String,
        enum: ["User", "Vendor", "Driver"],
        default: "User",
    },
}, { timestamps: { createdAt: true, updatedAt: false } });

const leadSchema = new mongoose.Schema({
    leadId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    customerName: {
        type: String,
        required: true,
        trim: true,
    },
    mobileNumber: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
    },
    leadSource: {
        type: String,
        enum: LEAD_SOURCES,
        required: true,
    },
    pickupLocation: {
        type: String,
        required: true,
        trim: true,
    },
    dropLocation: {
        type: String,
        required: true,
        trim: true,
    },
    /** Exact addresses captured at confirm (used on confirm mail / trip) */
    exactPickupLocation: {
        type: String,
        trim: true,
        default: "",
    },
    exactDropLocation: {
        type: String,
        trim: true,
        default: "",
    },
    addressProofType: {
        type: String,
        enum: ADDRESS_PROOF_TYPES,
        default: null,
    },
    addressProof: {
        type: addressProofDocSchema,
        default: null,
    },
    /** PENDING = nothing paid · PARTIALLY_PAID = advance · PAID = full */
    paymentStatus: {
        type: String,
        enum: LEAD_PAYMENT_STATUSES,
        default: "PENDING",
        index: true,
    },
    travelDate: {
        type: Date,
        required: true,
    },
    /** Required when trip type is MULTI_DAY; otherwise null */
    endDate: {
        type: Date,
        default: null,
    },
    pickupTime: {
        type: String,
        required: true,
        trim: true,
    },
    tripType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TripType",
        required: true,
    },
    cabType: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CarType",
        required: true,
    },
    customerRequirements: {
        type: String,
        trim: true,
        default: "",
    },
    remarks: {
        type: String,
        trim: true,
        default: "",
    },
    status: {
        type: String,
        enum: LEAD_STATUSES,
        default: "PENDING",
    },
    followUps: {
        type: [followUpSchema],
        default: [],
    },
    nextFollowUpDate: {
        type: Date,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    confirmedAt: {
        type: Date,
        default: null,
    },
    activeVendorOffer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VendorOffer",
        default: null,
    },
    /** How this confirmed lead is assigned: FIXED offer or BID auction */
    assignmentMode: {
        type: String,
        enum: ["FIXED", "BID"],
        default: undefined,
    },
    activeBidRound: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BidRound",
        default: null,
    },
    assignedVendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        default: null,
    },
    assignedDriver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null,
    },
    assignedVehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null,
    },
    pickupCode: {
        type: String,
        default: null,
    },
    pickupCodeAttempts: {
        type: Number,
        default: 0,
    },
    /** Drop / complete confirmation OTP (emailed to customer) — hash only */
    completeOtpHash: {
        type: String,
        default: null,
        select: false,
    },
    completeOtpExpiresAt: {
        type: Date,
        default: null,
        select: false,
    },
    completeOtpAttempts: {
        type: Number,
        default: 0,
    },
    completeOtpSentAt: {
        type: Date,
        default: null,
    },
    completeOtpVerifiedAt: {
        type: Date,
        default: null,
    },
    confirmedQuotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quotation",
        default: null,
    },
    /** Client grand total including GST */
    grandTotal: {
        type: Number,
        default: 0,
        min: 0,
    },
    tripAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    gstPercent: {
        type: Number,
        default: 0,
        min: 0,
    },
    gstAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    advancePaid: {
        type: Number,
        default: 0,
        min: 0,
    },
    pendingAmount: {
        type: Number,
        default: 0,
        min: 0,
    },
    payments: {
        type: [paymentSchema],
        default: [],
    },
    tripStartedAt: {
        type: Date,
        default: null,
    },
    tripCompletedAt: {
        type: Date,
        default: null,
    },
    activeRazorpayOrderId: {
        type: String,
        default: null,
    },
    /** Final tax invoice after trip payment / completion */
    invoiceId: {
        type: String,
        trim: true,
        default: null,
        index: true,
    },
    invoicePdfUrl: {
        type: String,
        default: null,
    },
    invoiceGeneratedAt: {
        type: Date,
        default: null,
    },
    /** Booking cancel (allowed only before trip start / pickup) */
    cancellationReason: {
        type: String,
        trim: true,
        default: "",
    },
    cancelledAt: {
        type: Date,
        default: null,
        index: true,
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    cancelledByName: {
        type: String,
        trim: true,
        default: "",
    },
    cancelledByDesignation: {
        type: String,
        trim: true,
        default: "",
    },
    cancelledByEmail: {
        type: String,
        trim: true,
        default: "",
    },
    statusBeforeCancel: {
        type: String,
        default: null,
    },
}, { timestamps: true });

leadSchema.index({ status: 1 });
leadSchema.index({ leadSource: 1 });
leadSchema.index({ travelDate: 1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ assignedDriver: 1, status: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, cancelledAt: -1 });
leadSchema.index({
    leadId: "text",
    customerName: "text",
    mobileNumber: "text",
    email: "text",
    pickupLocation: "text",
    dropLocation: "text",
});

leadSchema.methods.recalcPending = function recalcPending() {
    const paid = (this.payments || [])
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    this.advancePaid = Math.round(paid * 100) / 100;
    const grand = Number(this.grandTotal || 0);
    const pending = Math.max(0, grand - paid);
    this.pendingAmount = Math.round(pending * 100) / 100;

    if (paid <= 0) {
        this.paymentStatus = "PENDING";
    } else if (grand > 0 && paid + 0.009 >= grand) {
        this.paymentStatus = "PAID";
    } else {
        this.paymentStatus = "PARTIALLY_PAID";
    }
    return this.pendingAmount;
};

const Lead = mongoose.model("Lead", leadSchema);

module.exports = Lead;
module.exports.LEAD_SOURCES = LEAD_SOURCES;
module.exports.LEAD_STATUSES = LEAD_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.LEAD_PAYMENT_STATUSES = LEAD_PAYMENT_STATUSES;
module.exports.ADDRESS_PROOF_TYPES = ADDRESS_PROOF_TYPES;
