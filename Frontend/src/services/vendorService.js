import api from "./api";

export const vendorTypeService = {
  list: (params) => api.get("/admin/vendor-types/list", { params }),
  dropdown: () => api.get("/admin/vendor-types/list", { params: { dropdown: 1 } }),
  create: (data) => api.post("/admin/vendor-types/create", data),
  update: (id, data) => api.patch(`/admin/vendor-types/update/${id}`, data),
  changeStatus: (id, status) => api.patch(`/admin/vendor-types/status/${id}`, { status }),
  remove: (id) => api.delete(`/admin/vendor-types/${id}`),
};

export const VENDOR_ACCOUNT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const VENDOR_VERIFY_STATUSES = [
  { value: "PENDING", label: "Pending Verify" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

/** Sidebar + in-page switcher */
export const VENDOR_LIST_PAGES = [
  {
    key: "all",
    label: "All Vendors",
    href: "/dashboard/vendors",
    countKey: "ALL",
    lockedStatus: "",
    lockedVerify: "",
  },
  ...VENDOR_ACCOUNT_STATUSES.map((s) => ({
    key: `status-${s.value}`,
    label: s.label,
    href: `/dashboard/vendors/status/${s.value}`,
    countKey: s.value,
    lockedStatus: s.value,
    lockedVerify: "",
  })),
  ...VENDOR_VERIFY_STATUSES.map((s) => ({
    key: `verify-${s.value}`,
    label: s.label,
    href: `/dashboard/vendors/verify/${s.value}`,
    countKey: `VERIFY_${s.value}`,
    lockedStatus: "",
    lockedVerify: s.value,
  })),
];

export const vendorListHref = ({ status = "", verify = "" } = {}) => {
  if (status) return `/dashboard/vendors/status/${status}`;
  if (verify) return `/dashboard/vendors/verify/${verify}`;
  return "/dashboard/vendors";
};

export const vendorAccountLabel = (value) =>
  VENDOR_ACCOUNT_STATUSES.find((s) => s.value === value)?.label || value || "—";

export const vendorVerifyLabel = (value) =>
  VENDOR_VERIFY_STATUSES.find((s) => s.value === value)?.label || value || "—";

export const vendorService = {
  list: (params) => api.get("/admin/vendors/list", { params }),
  statusCounts: () => api.get("/admin/vendors/status-counts"),
  getById: (id) => api.get(`/admin/vendors/details/${id}`),
  create: (formData) =>
    api.post("/admin/vendors/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, formData) =>
    api.patch(`/admin/vendors/update/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  changeStatus: (id, status) => api.patch(`/admin/vendors/status/${id}`, { status }),
  verify: (id, documentVerificationStatus, internalNotes) =>
    api.patch(`/admin/vendors/${id}/verify`, { documentVerificationStatus, internalNotes }),
  setBusinessModel: (id, data) => api.patch(`/admin/vendors/${id}/business-model`, data),
  getFixedShareSettings: () => api.get("/admin/vendors/fixed-share-settings"),
  updateFixedShareSettings: (data) => api.patch("/admin/vendors/fixed-share-settings", data),
  pendingDocuments: (params) => api.get("/admin/vendors/pending-documents", { params }),
  sendDocumentReminders: () => api.post("/admin/vendors/pending-documents/send-reminders"),
  remove: (id) => api.delete(`/admin/vendors/${id}`),
};
