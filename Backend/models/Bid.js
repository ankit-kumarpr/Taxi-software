const mongoose = require("mongoose");

const BID_STATUSES = ["ACTIVE", "WITHDRAWN", "WON", "LOST"];

const bidSchema = new mongoose.Schema(
    {
        bidRound: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BidRound",
            required: true,
            index: true,
        },
        lead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Lead",
            required: true,
            index: true,
        },
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },
        amount: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: BID_STATUSES,
            default: "ACTIVE",
            index: true,
        },
        placedAt: {
            type: Date,
            default: Date.now,
        },
        note: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

bidSchema.index({ bidRound: 1, vendor: 1 }, { unique: true });
bidSchema.index({ bidRound: 1, amount: 1, placedAt: 1 });

module.exports = mongoose.model("Bid", bidSchema);
module.exports.BID_STATUSES = BID_STATUSES;
