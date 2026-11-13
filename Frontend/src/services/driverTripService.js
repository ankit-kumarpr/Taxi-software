import api from "./api";

export const driverTripService = {
  list: (params) => api.get("/driver/trips", { params }),
  getById: (id) => api.get(`/driver/trips/${id}`),
  invoice: (id, params) => api.get(`/driver/trips/${id}/invoice`, { params }),
  start: (id, pickupCode) => api.post(`/driver/trips/${id}/start`, { pickupCode }),
  sendCompleteOtp: (id) => api.post(`/driver/trips/${id}/send-complete-otp`),
  complete: (id, completeOtp) =>
    api.post(`/driver/trips/${id}/complete`, completeOtp ? { completeOtp } : {}),
  verifyPayment: (id, data) => api.post(`/driver/trips/${id}/verify-payment`, data),
};
