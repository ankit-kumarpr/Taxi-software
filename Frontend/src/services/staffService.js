import api from "./api";

const toFormData = (payload, files = []) => {
  const fd = new FormData();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === "object" && !(value instanceof Blob)) {
      fd.append(key, JSON.stringify(value));
    } else {
      fd.append(key, value);
    }
  });
  files.forEach((item) => {
    if (!item?.file) return;
    fd.append("documents", item.file);
  });
  if (files.length) {
    fd.append(
      "documentNames",
      JSON.stringify(files.map((f) => f.name || f.file?.name || "Document"))
    );
  }
  return fd;
};

export const staffService = {
  catalog: () => api.get("/admin/permissions/catalog"),
  list: (params) => api.get("/admin/staff", { params }),
  get: (id) => api.get(`/admin/staff/${id}`),
  create: (payload, files = []) =>
    api.post("/admin/staff", toFormData(payload, files), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, payload, files = []) =>
    api.patch(`/admin/staff/${id}`, toFormData(payload, files), {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  remove: (id) => api.delete(`/admin/staff/${id}`),
  setPermissions: (id, data) => api.put(`/admin/staff/${id}/permissions`, data),
  setDesignationPermissions: (id, permissions) =>
    api.put(`/admin/designations/${id}/permissions`, { permissions }),
};
