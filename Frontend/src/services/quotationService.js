import api from "./api";

export const quotationService = {
  prefill: (leadId) => api.get(`/admin/quotations/prefill/${leadId}`),
  listByLead: (leadId) => api.get(`/admin/quotations/by-lead/${leadId}`),
  getById: (id) => api.get(`/admin/quotations/details/${id}`),
  create: (data) => api.post("/admin/quotations/create", data),
  update: (id, data) => api.patch(`/admin/quotations/update/${id}`, data),
  send: (id, data) => api.post(`/admin/quotations/${id}/send`, data),
  remove: (id) => api.delete(`/admin/quotations/${id}`),
};

export const moneyInr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const calcGst = (tripAmount, gstPercent) => {
  const amount = Number(tripAmount) || 0;
  const gst = Number(gstPercent) || 0;
  const gstAmount = Math.round(((amount * gst) / 100) * 100) / 100;
  const grandTotal = Math.round((amount + gstAmount) * 100) / 100;
  return { tripAmount: amount, gstPercent: gst, gstAmount, grandTotal };
};
