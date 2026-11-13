const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
    "NEW_LEAD",
    "FOLLOW_UP_DUE",
    "FOLLOW_UP_SCHEDULED",
    "BID_OPENED",
    "BID_PLACED",
    "BID_ACCEPTED",
    "BID_EXPIRED",
];

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    type: {
        type: String,
        enum: NOTIFICATION_TYPES,
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    link: {
        type: String,
        default: "/dashboard/leads",
        trim: true,
    },
    meta: {
        leadMongoId: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", default: null },
        leadId: { type: String, default: "" },
        customerName: { type: String, default: "" },
        followUpDate: { type: String, default: "" },
        followUpTime: { type: String, default: "" },
        reason: { type: String, default: "" },
        leadSource: { type: String, default: "" },
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    // Dedup key for due follow-ups (e.g. FOLLOW_UP_DUE:leadId:2026-10-24)
    dedupeKey: {
        type: String,
        default: null,
        index: true,
    },
}, { timestamps: true });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;
