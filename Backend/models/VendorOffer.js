const mongoose = require("mongoose");

const OFFER_STATUSES = ["OFFERED", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"];

const vendorOfferSchema = new mongoose.Schema(
    {
        offerId: {
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
        quotation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quotation",
            required: true,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },
        offerType: {
            type: String,
            enum: ["FIXED", "BID"],
            default: "FIXED",
        },
        bidRound: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BidRound",
            default: null,
        },
        /** Winning vendor bid amount (BID offers) */
        bidAmount: {
            type: Number,
            default: null,
            min: 0,
        },
        /** Client trip amount before GST (from quotation.tripAmount) */
        tripAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        companySharePercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        companyShareAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        /** Option B: tripAmount - companyShareAmount */
        vendorPayout: {
            type: Number,
            required: true,
            min: 0,
        },
        /** Trip snapshot (no client PII until driver assigned) */
        pickupLocation: { type: String, required: true, trim: true },
        dropLocation: { type: String, required: true, trim: true },
        travelDate: { type: Date, required: true },
        pickupTime: { type: String, required: true, trim: true },
        tripTypeName: { type: String, default: "" },
        cabTypeName: { type: String, default: "" },

        status: {
            type: String,
            enum: OFFER_STATUSES,
            default: "OFFERED",
            index: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        offeredAt: {
            type: Date,
            default: Date.now,
        },
        acceptedAt: { type: Date, default: null },
        rejectedAt: { type: Date, default: null },
        rejectReason: { type: String, default: "" },

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
        driverAssignedAt: { type: Date, default: null },
        pickupCode: {
            type: String,
            default: null,
        },
        /** Client details released only after driver assign */
        clientDetailsReleased: {
            type: Boolean,
            default: false,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        notes: {
            type: String,
            default: "",
        },
    },
    { timestamps: true }
);

vendorOfferSchema.index({ vendor: 1, status: 1, createdAt: -1 });
vendorOfferSchema.index({ lead: 1, status: 1 });

module.exports = mongoose.model("VendorOffer", vendorOfferSchema);
module.exports.OFFER_STATUSES = OFFER_STATUSES;
