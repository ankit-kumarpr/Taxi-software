const express = require("express");
const router = express.Router();

const {
    listNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    markReadByLead,
} = require("../controllers/notification.controller");

/**
 * @swagger
 * tags:
 *   name: Admin - Notifications
 *   description: In-app notifications for new leads and follow-ups
 */

router.get("/list", listNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/read-by-lead/:leadId", markReadByLead);
router.patch("/:id/read", markAsRead);

module.exports = router;
