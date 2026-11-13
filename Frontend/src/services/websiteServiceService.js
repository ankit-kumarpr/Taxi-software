import api from "./api";

export const SERVICE_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "INACTIVE", label: "Inactive" },
];

export const websiteServiceService = {
  list: (params) => api.get("/admin/services/list", { params }),
  get: (id) => api.get(`/admin/services/details/${id}`),
  create: (formData) =>
    api.post("/admin/services/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/admin/services/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/admin/services/status/${id}`, { status }),
  remove: (id) => api.delete(`/admin/services/${id}`),
};
