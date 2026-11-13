import api from "./api";

export const driverService = {
  list: (params) => api.get("/drivers/list", { params }),
  getById: (id) => api.get(`/drivers/details/${id}`),
  create: (formData) =>
    api.post("/drivers/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/drivers/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/drivers/status/${id}`, { status }),
  verify: (id, documentVerificationStatus, rejectionReason) =>
    api.patch(`/drivers/${id}/verify`, {
      documentVerificationStatus,
      ...(rejectionReason ? { rejectionReason } : {}),
    }),
  remove: (id) => api.delete(`/drivers/${id}`),
  becomeVendorPrefill: () => api.get("/drivers/become-vendor/prefill"),
  becomeVendor: (formData) =>
    api.post("/drivers/become-vendor", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  promoteVendorPrefill: (id) => api.get(`/drivers/${id}/promote-vendor/prefill`),
  promoteVendor: (id, formData) =>
    api.post(`/drivers/${id}/promote-vendor`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
