import api from "./api";

export const ACCOUNTS_PAGES = [
  {
    key: "overview",
    label: "Overview",
    href: "/dashboard/accounts",
    countKey: "overview",
  },
  {
    key: "trips",
    label: "Trip Ledger",
    href: "/dashboard/accounts/trips",
    countKey: "trips",
  },
  {
    key: "payments",
    label: "Payments",
    href: "/dashboard/accounts/payments",
    countKey: "payments",
  },
  {
    key: "quotations",
    label: "Quotations",
    href: "/dashboard/accounts/quotations",
    countKey: "quotations",
  },
  {
    key: "payouts",
    label: "Vendor Payouts",
    href: "/dashboard/accounts/vendor-payouts",
    countKey: "payouts",
  },
];

export const accountsService = {
  summary: (params) => api.get("/admin/accounts/summary", { params }),
  navCounts: () => api.get("/admin/accounts/nav-counts"),
  trips: (params) => api.get("/admin/accounts/trips", { params }),
  payments: (params) => api.get("/admin/accounts/payments", { params }),
  quotations: (params) => api.get("/admin/accounts/quotations", { params }),
  vendorPayouts: (params) => api.get("/admin/accounts/vendor-payouts", { params }),
};

export const moneyInr = (n) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const numIn = (n) => Number(n || 0).toLocaleString("en-IN");

export const defaultAccountsRange = () => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
};
