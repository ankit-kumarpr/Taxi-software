import api from "./api";

export const BLOG_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "INACTIVE", label: "Inactive" },
];

export const blogService = {
  list: (params) => api.get("/admin/blogs/list", { params }),
  get: (id) => api.get(`/admin/blogs/details/${id}`),
  create: (formData) =>
    api.post("/admin/blogs/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/admin/blogs/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/admin/blogs/status/${id}`, { status }),
  remove: (id) => api.delete(`/admin/blogs/${id}`),
};
