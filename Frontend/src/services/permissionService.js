import api from "./api";

export const permissionService = {
  list: (params) => api.get("/admin/permissions", { params }),
  catalog: () => api.get("/admin/permissions/catalog"),
  get: (id) => api.get(`/admin/permissions/${id}`),
  update: (id, data) => api.patch(`/admin/permissions/${id}`, data),
  remove: (id) => api.delete(`/admin/permissions/${id}`),
  seed: () => api.post("/admin/permissions/seed"),
};
