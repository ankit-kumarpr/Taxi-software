import api from "./api";

export const vendorOfferService = {
  listFixedVendors: () => api.get("/admin/vendor-offers/fixed-vendors"),
  create: (data) => api.post("/admin/vendor-offers/create", data),
  listByLead: (leadId) => api.get(`/admin/vendor-offers/by-lead/${leadId}`),
  getById: (id) => api.get(`/admin/vendor-offers/details/${id}`),
  cancel: (id) => api.post(`/admin/vendor-offers/${id}/cancel`),
  assignDriver: (id, data) => api.post(`/admin/vendor-offers/${id}/assign-driver`, data),

  // Vendor self
  myOffers: (params) => api.get("/vendor/offers", { params }),
  myOffer: (id) => api.get(`/vendor/offers/${id}`),
  accept: (id) => api.post(`/vendor/offers/${id}/accept`),
  reject: (id, reason) => api.post(`/vendor/offers/${id}/reject`, { reason }),
};

export const moneyInr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
