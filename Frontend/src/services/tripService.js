import api from "./api";

const apiOrigin = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/$/, "");

export const invoicePdfHref = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
};

export const tripService = {
  /** Vendor fleet trips */
  vendorList: (params) => api.get("/vendor/trips", { params }),
  vendorDriverStats: (params) => api.get("/vendor/trips/driver-stats", { params }),
  vendorInvoice: (id, params) => api.get(`/vendor/trips/${id}/invoice`, { params }),
  /** Admin all trips */
  adminList: (params) => api.get("/admin/trips", { params }),
  adminDriverStats: (params) => api.get("/admin/trips/driver-stats", { params }),
  adminInvoice: (id, params) => api.get(`/admin/trips/${id}/invoice`, { params }),
  adminComplete: (id, body) => api.post(`/admin/trips/${id}/complete`, body),
  adminVerifyPayment: (id, body) => api.post(`/admin/trips/${id}/verify-payment`, body),
};
