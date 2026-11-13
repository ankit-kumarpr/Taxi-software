import api from "./api";

export const companyProfileService = {
  get: () => api.get("/admin/company-profile"),
  update: (formData) =>
    api.patch("/admin/company-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
