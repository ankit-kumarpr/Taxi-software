import api from "./api";

export const vehicleService = {
  list: (params) => api.get("/vehicles/list", { params }),
  getById: (id) => api.get(`/vehicles/details/${id}`),
  lookupRc: (registrationNumber) =>
    api.post("/vehicles/lookup-rc", { registrationNumber }),
  create: (formData) =>
    api.post("/vehicles/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/vehicles/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/vehicles/status/${id}`, { status }),
  remove: (id) => api.delete(`/vehicles/${id}`),
};
