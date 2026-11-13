import api from "./api";

export const notificationService = {
  list: (params) => api.get("/admin/notifications/list", { params }),
  unreadCount: () => api.get("/admin/notifications/unread-count"),
  markRead: (id) => api.patch(`/admin/notifications/${id}/read`),
  markAllRead: () => api.patch("/admin/notifications/read-all"),
  markReadByLead: (leadId) => api.patch(`/admin/notifications/read-by-lead/${leadId}`),
};

export const FOLLOW_STICKY_TYPES = new Set(["FOLLOW_UP_DUE", "FOLLOW_UP_SCHEDULED"]);

export const isFollowSticky = (notification) =>
  Boolean(notification?.type && FOLLOW_STICKY_TYPES.has(notification.type));
