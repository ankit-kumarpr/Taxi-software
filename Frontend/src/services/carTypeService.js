import api from "./api";

export const carTypeService = {
  list: (params) => api.get("/car-types/list", { params }),
  dropdown: () => api.get("/car-types/list", { params: { dropdown: 1 } }),
  create: (data) => api.post("/car-types/create", data),
  update: (id, data) => api.patch(`/car-types/update/${id}`, data),
  changeStatus: (id, status) => api.patch(`/car-types/status/${id}`, { status }),
  remove: (id) => api.delete(`/car-types/${id}`),
};
