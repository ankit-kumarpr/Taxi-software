const mongoose = require("mongoose");

const VENDOR_NOTIFICATION_TYPES = [
    "BID_OPENED",
    "BID_UPDATED",
    "BID_WON",
    "BID_LOST",
    "BID_EXPIRED",
    "OFFER_FIXED",
];

const vendorNotificationSchema = new mongoose.Schema(
    {
        vendor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Vendor",
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: VENDOR_NOTIFICATION_TYPES,
            required: true,
        },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        link: { type: String, default: "/dashboard/vendor-offers", trim: true },
        meta: {
            leadMongoId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
            leadId: { type: String, default: "" },
            bidRoundId: { type: String, default: "" },
            amount: { type: Number, default: null },
        },
        isRead: { type: Boolean, default: false, index: true },
    },
    { timestamps: true }
);

vendorNotificationSchema.index({ vendor: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model("VendorNotification", vendorNotificationSchema);
module.exports.VENDOR_NOTIFICATION_TYPES = VENDOR_NOTIFICATION_TYPES;
