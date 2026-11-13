import api from "./api";

export const LEAD_SOURCES = [
  { value: "CALLS", label: "Calls" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "META", label: "Meta" },
  { value: "WEBSITE", label: "Website" },
  { value: "EMAIL", label: "Email" },
  { value: "DIRECT", label: "Direct" },
];

export const LEAD_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "NEW", label: "New" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "QUOTATION_SEND", label: "Quotation Send" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "VENDOR_OFFERED", label: "Vendor Offered" },
  { value: "VENDOR_ACCEPTED", label: "Vendor Accepted" },
  { value: "DRIVER_ASSIGNED", label: "Driver & Car Assigned" },
  { value: "TRIP_STARTED", label: "Trip Started" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "LOST", label: "Lost" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const leadStatusLabel = (value) =>
  LEAD_STATUSES.find((s) => s.value === value)?.label || value || "—";

export const leadSourceLabel = (value) =>
  LEAD_SOURCES.find((s) => s.value === value)?.label || value || "—";

export const leadSourceColor = (source) => {
  switch (String(source || "").toUpperCase()) {
    case "CALLS":
      return "bg-sky-100 text-sky-800";
    case "WHATSAPP":
      return "bg-emerald-100 text-emerald-800";
    case "META":
      return "bg-indigo-100 text-indigo-800";
    case "WEBSITE":
      return "bg-violet-100 text-violet-800";
    case "EMAIL":
      return "bg-amber-100 text-amber-800";
    case "DIRECT":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

export const LEAD_PAYMENT_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
];

export const leadPaymentStatusLabel = (value) =>
  LEAD_PAYMENT_STATUSES.find((s) => s.value === value)?.label || value || "Pending";

/** Parse stored time ("14:30" or "2:30 PM") into { hour, minute, period } */
export const parsePickupTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return { hour: "", minute: "00", period: "AM" };

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    return {
      hour: String(Math.min(12, Math.max(1, Number(ampm[1])))),
      minute: ampm[2].padStart(2, "0"),
      period: ampm[3].toUpperCase(),
    };
  }

  const h24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (h24) {
    let h = Number(h24[1]);
    const minute = h24[2].padStart(2, "0");
    const period = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return { hour: String(h), minute, period };
  }

  return { hour: "", minute: "00", period: "AM" };
};

/** Build display/storage string like "2:30 PM" */
export const formatPickupTime = (hour, minute, period) => {
  if (!hour) return "";
  const h = String(Number(hour));
  const m = String(minute || "00").padStart(2, "0");
  const p = period === "PM" ? "PM" : "AM";
  return `${h}:${m} ${p}`;
};

/** Normalize any stored value to AM/PM for display */
export const displayPickupTime = (value) => {
  if (!value) return "—";
  if (/AM|PM/i.test(value)) return String(value).trim().toUpperCase().replace(/\s*(AM|PM)$/, " $1");
  const parsed = parsePickupTime(value);
  return formatPickupTime(parsed.hour, parsed.minute, parsed.period) || value;
};

/** Sidebar / page switcher entries: All + every status */
export const LEAD_LIST_PAGES = [
  { value: "", label: "All Leads", href: "/dashboard/leads", countKey: "ALL" },
  ...LEAD_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
    href: `/dashboard/leads/status/${s.value}`,
    countKey: s.value,
  })),
];

export const leadListHref = (status) =>
  status ? `/dashboard/leads/status/${status}` : "/dashboard/leads";

export const leadStatusColor = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "NEW":
      return "bg-sky-100 text-sky-800";
    case "FOLLOW_UP":
      return "bg-primary-light text-primary";
    case "QUOTATION_SEND":
      return "bg-violet-100 text-violet-800";
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "VENDOR_OFFERED":
      return "bg-blue-100 text-blue-800";
    case "VENDOR_ACCEPTED":
      return "bg-teal-100 text-teal-800";
    case "DRIVER_ASSIGNED":
      return "bg-emerald-100 text-emerald-800";
    case "TRIP_STARTED":
      return "bg-cyan-100 text-cyan-800";
    case "PAYMENT_PENDING":
      return "bg-orange-100 text-orange-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "LOST":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

/** Statuses that can still be cancelled before pickup */
export const canCancelLeadStatus = (status) =>
  [
    "PENDING",
    "NEW",
    "FOLLOW_UP",
    "QUOTATION_SEND",
    "CONFIRMED",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "DRIVER_ASSIGNED",
  ].includes(status);

/** After trip starts / completes — no create or edit quotation on this lead */
export const QUOTATION_LOCKED_STATUSES = [
  "TRIP_STARTED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "CANCELLED",
  "LOST",
];

export const canManageQuotations = (status) =>
  !QUOTATION_LOCKED_STATUSES.includes(String(status || "").toUpperCase());

export const leadService = {
  list: (params) => api.get("/admin/leads/list", { params }),
  statusCounts: () => api.get("/admin/leads/status-counts"),
  repeatCustomers: (params) => api.get("/admin/leads/repeat-customers", { params }),
  repeatCustomer: (mobile) =>
    api.get(`/admin/leads/repeat-customers/${encodeURIComponent(mobile)}`),
  similar: (params) => api.get("/admin/leads/similar", { params }),
  cancelled: (params) => api.get("/admin/leads/cancelled", { params }),
  getById: (id) => api.get(`/admin/leads/details/${id}`),
  create: (data) => api.post("/admin/leads/create", data),
  update: (id, data) => api.patch(`/admin/leads/update/${id}`, data),
  changeStatus: (id, status) => api.patch(`/admin/leads/status/${id}`, { status }),
  cancel: (id, reason) => api.post(`/admin/leads/${id}/cancel`, { reason }),
  confirm: (id, data = {}) => {
    const isForm = typeof FormData !== "undefined" && data instanceof FormData;
    return api.post(`/admin/leads/${id}/confirm`, data, isForm
      ? { headers: { "Content-Type": "multipart/form-data" } }
      : undefined);
  },
  verifyAdvance: (id, data) => api.post(`/admin/leads/${id}/verify-advance`, data),
  remove: (id) => api.delete(`/admin/leads/${id}`),
  addFollowUp: (id, data) => api.post(`/admin/leads/${id}/follow-ups`, data),
  updateFollowUp: (id, followUpId, data) =>
    api.patch(`/admin/leads/${id}/follow-ups/${followUpId}`, data),
  removeFollowUp: (id, followUpId) => api.delete(`/admin/leads/${id}/follow-ups/${followUpId}`),
};
