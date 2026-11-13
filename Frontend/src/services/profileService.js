import api from "./api";

export const profileService = {
  getMe: () => api.get("/auth/me"),
  update: (data) => api.patch("/auth/profile", data),
};
