import api from "./api";

export const ADMIN_BID_STATUSES = [
  { value: "OPEN", label: "Open" },
  { value: "CLOSED", label: "Closed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const bidListHref = (status) =>
  status ? `/dashboard/live-bids/status/${status}` : "/dashboard/live-bids";

export const bidService = {
  listBidVendors: () => api.get("/admin/bids/vendors"),
  statusCounts: () => api.get("/admin/bids/status-counts"),
  listRounds: (params) => api.get("/admin/bids/rounds", { params }),
  open: (data) => api.post("/admin/bids/open", data),
  byLead: (leadId) => api.get(`/admin/bids/by-lead/${leadId}`),
  accept: (bidId) => api.post(`/admin/bids/bids/${bidId}/accept`),
  cancelRound: (roundId) => api.post(`/admin/bids/rounds/${roundId}/cancel`),

  vendorOpenBids: (params) => api.get("/vendor/bids/open", { params }),
  placeBid: (roundId, data) => api.post(`/vendor/bids/rounds/${roundId}/place`, data),
  notifications: () => api.get("/vendor/notifications"),
  markNotificationRead: (id) => api.patch(`/vendor/notifications/${id}/read`),
  markNotificationsRead: () => api.post("/vendor/notifications/read-all"),
};

export const moneyInr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const remainingMs = (expiresAt, serverNow) => {
  const end = new Date(expiresAt).getTime();
  const now = serverNow ? new Date(serverNow).getTime() : Date.now();
  return Math.max(0, end - now);
};

export const formatCountdown = (ms) => {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};
