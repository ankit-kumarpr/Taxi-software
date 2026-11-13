import api from "./api";

export const PACKAGE_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "INACTIVE", label: "Inactive" },
];

export const websitePackageService = {
  list: (params) => api.get("/admin/packages/list", { params }),
  get: (id) => api.get(`/admin/packages/details/${id}`),
  create: (formData) =>
    api.post("/admin/packages/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/admin/packages/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/admin/packages/status/${id}`, { status }),
  remove: (id) => api.delete(`/admin/packages/${id}`),
};
