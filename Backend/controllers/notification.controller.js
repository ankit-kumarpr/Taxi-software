const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { syncDueFollowUpNotifications } = require("../services/notification.service");
const { parsePagination, paginationMeta } = require("../utils/pagination");

const listNotifications = async (req, res, next) => {
    try {
        // Sync due follow-ups before listing (lightweight + deduped)
        await syncDueFollowUpNotifications().catch(() => {});

        const { unreadOnly, page = 1, limit = 20 } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);
        const filter = { user: req.user._id };

        if (unreadOnly === "1" || unreadOnly === "true") {
            filter.isRead = false;
        }

        const [total, data] = await Promise.all([
            Notification.countDocuments(filter),
            Notification.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
        ]);

        res.status(200).json({
            success: true,
            data,
            pagination: paginationMeta(total, pageNum, limitNum),
        });
    } catch (error) {
        next(error);
    }
};

const getUnreadCount = async (req, res, next) => {
    try {
        await syncDueFollowUpNotifications().catch(() => {});

        const count = await Notification.countDocuments({
            user: req.user._id,
            isRead: false,
        });

        // Brand-new toasts (last 2 minutes) — e.g. NEW_LEAD
        const since = new Date(Date.now() - 2 * 60 * 1000);
        let fresh = await Notification.find({
            user: req.user._id,
            isRead: false,
            createdAt: { $gte: since },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        if (!fresh.length && count > 0) {
            fresh = [];
        }

        // Follow-up alerts stay sticky until the lead is opened (survive refresh)
        const stickyFollowUps = await Notification.find({
            user: req.user._id,
            isRead: false,
            type: { $in: ["FOLLOW_UP_DUE", "FOLLOW_UP_SCHEDULED"] },
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            success: true,
            data: {
                unreadCount: count,
                fresh,
                stickyFollowUps,
            },
        });
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID" });
        }

        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { returnDocument: "after" }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Marked as read", data: notification });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read" });
    } catch (error) {
        next(error);
    }
};

/** Mark all unread notifications for a lead as read (when lead view is opened). */
const markReadByLead = async (req, res, next) => {
    try {
        const { leadId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(leadId)) {
            return res.status(400).json({ success: false, message: "Invalid lead ID" });
        }

        const result = await Notification.updateMany(
            {
                user: req.user._id,
                isRead: false,
                "meta.leadMongoId": leadId,
            },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: "Lead notifications marked as read",
            data: { modified: result.modifiedCount || 0 },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    markReadByLead,
};
