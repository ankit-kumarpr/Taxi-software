import api from "./api";

export const tripTypeService = {
  // Admin CRUD stays under /admin; dropdown is shared so vendors can load options
  list: (params) => api.get("/admin/trip-types/list", { params }),
  dropdown: () => api.get("/trip-types/list", { params: { dropdown: 1 } }),
  create: (data) => api.post("/admin/trip-types/create", data),
  update: (id, data) => api.patch(`/admin/trip-types/update/${id}`, data),
  changeStatus: (id, status) => api.patch(`/admin/trip-types/status/${id}`, { status }),
  remove: (id) => api.delete(`/admin/trip-types/${id}`),
};
