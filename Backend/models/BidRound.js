const mongoose = require("mongoose");

const BID_ROUND_STATUSES = ["OPEN", "CLOSED", "EXPIRED", "CANCELLED"];

const bidRoundSchema = new mongoose.Schema(
    {
        roundId: {
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
        /** Admin ceiling — vendor bid cannot exceed this */
        maxBidAmount: {
            type: Number,
            required: true,
            min: 1,
        },
        /** Client trip amount (pre-GST) for company share math */
        tripAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        gstAmount: {
            type: Number,
            default: 0,
            min: 0,
        },
        grandTotal: {
            type: Number,
            default: 0,
            min: 0,
        },
        pickupLocation: { type: String, required: true, trim: true },
        dropLocation: { type: String, required: true, trim: true },
        travelDate: { type: Date, required: true },
        pickupTime: { type: String, required: true, trim: true },
        tripTypeName: { type: String, default: "" },
        cabTypeName: { type: String, default: "" },
        status: {
            type: String,
            enum: BID_ROUND_STATUSES,
            default: "OPEN",
            index: true,
        },
        openedAt: { type: Date, default: Date.now },
        expiresAt: { type: Date, required: true, index: true },
        closedAt: { type: Date, default: null },
        winningBid: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bid",
            default: null,
        },
        winningVendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            default: null,
        },
        resultingOffer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "VendorOffer",
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
        notes: { type: String, default: "" },
    },
    { timestamps: true }
);

bidRoundSchema.index({ lead: 1, status: 1 });

module.exports = mongoose.model("BidRound", bidRoundSchema);
module.exports.BID_ROUND_STATUSES = BID_ROUND_STATUSES;
