import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileText, RefreshCw, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { useAuth } from "../../context/AuthContext";
import { invoicePdfHref, tripService } from "../../services/tripService";
import { vendorService } from "../../services/vendorService";
import { moneyInr } from "../../services/quotationService";
import { displayPickupTime, leadStatusLabel } from "../../services/leadService";
import { cn } from "../../utils/cn";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function CompletedTrips() {
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";
  const isVendor = user?.userType === "VENDOR";

  const [tab, setTab] = useState("stats"); // stats | trips
  const [stats, setStats] = useState([]);
  const [summary, setSummary] = useState({ drivers: 0, completedTrips: 0 });
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [driverFilter, setDriverFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("COMPLETED");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    if (!isAdmin) return;
    vendorService
      .list({ status: "ACTIVE", documentVerificationStatus: "VERIFIED", limit: 200, page: 1 })
      .then((res) => setVendors(res.data.data || []))
      .catch(() => {});
  }, [isAdmin]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const params = {};
      if (isAdmin && vendorFilter) params.vendorId = vendorFilter;
      const res = isAdmin
        ? await tripService.adminDriverStats(params)
        : await tripService.vendorDriverStats(params);
      setStats(res.data.data || []);
      setSummary(res.data.summary || { drivers: 0, completedTrips: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load driver stats");
    } finally {
      setLoading(false);
    }
  };

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit,
        search: search || undefined,
        completedOnly: statusFilter === "COMPLETED" ? "1" : undefined,
        status: statusFilter !== "COMPLETED" ? statusFilter || undefined : undefined,
        driverId: driverFilter || undefined,
      };
      if (isAdmin && vendorFilter) params.vendorId = vendorFilter;
      const res = isAdmin
        ? await tripService.adminList(params)
        : await tripService.vendorList(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [vendorFilter, isAdmin]);

  useEffect(() => {
    if (tab === "trips") loadTrips();
  }, [tab, search, vendorFilter, driverFilter, statusFilter, page, limit, isAdmin]);

  const openInvoice = async (trip) => {
    try {
      const res = isAdmin
        ? await tripService.adminInvoice(trip._id, { regenerate: 1 })
        : await tripService.vendorInvoice(trip._id, { regenerate: 1 });
      const url = res.data.data?.invoicePdfUrl;
      if (!url) {
        toast.error("Invoice not available");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r._id === trip._id
            ? {
                ...r,
                invoiceId: res.data.data.invoiceId,
                invoicePdfUrl: url,
                invoiceGeneratedAt: res.data.data.invoiceGeneratedAt,
              }
            : r
        )
      );
      window.open(invoicePdfHref(url), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open invoice");
    }
  };

  if (!isAdmin && !isVendor) {
    return <div className="p-8 text-center text-slate-500">Not available for your role.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="ui-page-title">Driver trips</h1>
          <p className="ui-page-subtitle">
            {isVendor
              ? "Apne drivers ki completed / assigned trips dekho."
              : "Har driver ne kitni trips complete ki — full list."}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => (tab === "stats" ? loadStats() : loadTrips())}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("stats")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium",
            tab === "stats" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
          )}
        >
          <Users className="mr-1.5 inline h-4 w-4" />
          By driver
        </button>
        <button
          type="button"
          onClick={() => setTab("trips")}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-medium",
            tab === "trips" ? "bg-primary text-white" : "bg-slate-100 text-slate-700"
          )}
        >
          <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
          Trip list
        </button>
      </div>

      {isAdmin ? (
        <div className="flex flex-wrap gap-3">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={vendorFilter}
            onChange={(e) => {
              setVendorFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.companyName} ({v.vendorId})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drivers with completions</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.drivers || 0}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed trips</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{summary.completedTrips || 0}</p>
            </div>
          </div>

          <div className="ui-table-wrap">
            <div className="overflow-x-auto">
              <table className="ui-table text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Driver</th>
                    {isAdmin ? <th className="px-4 py-3">Vendor</th> : null}
                    <th className="px-4 py-3">Completed</th>
                    <th className="px-4 py-3">Trip value</th>
                    <th className="px-4 py-3">Last completed</th>
                    <th className="px-4 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : stats.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-500">
                        No completed trips yet.
                      </td>
                    </tr>
                  ) : (
                    stats.map((row) => (
                      <tr key={row.driverMongoId} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900">{row.name || "—"}</p>
                          <p className="text-[11px] text-muted">
                            {row.driverId} · {row.mobileNumber}
                          </p>
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-3 text-slate-600">
                            {row.vendorName || "—"}
                            {row.vendorId ? (
                              <span className="block text-xs text-slate-400">{row.vendorId}</span>
                            ) : null}
                          </td>
                        ) : null}
                        <td className="px-3 py-2.5">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            {row.completedTrips}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {moneyInr(row.totalGrand || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDate(row.lastCompletedAt)}</td>
                        <td className="px-3 py-2.5 text-right">
                          {row.driverMongoId ? (
                            <Link
                              to={`/dashboard/drivers/${row.driverMongoId}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Profile
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap">
            <div className="relative min-w-[14rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Search lead, customer, route…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="COMPLETED">Completed</option>
              <option value="DRIVER_ASSIGNED">Ready to start</option>
              <option value="TRIP_STARTED">In progress</option>
              <option value="PAYMENT_PENDING">Payment pending</option>
              <option value="">All active+completed</option>
            </select>
            {stats.length ? (
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={driverFilter}
                onChange={(e) => {
                  setDriverFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All drivers</option>
                {stats.map((s) => (
                  <option key={s.driverMongoId} value={s.driverMongoId}>
                    {s.name} ({s.completedTrips} done)
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="ui-table-wrap">
            <div className="overflow-x-auto">
              <table className="ui-table text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Trip</th>
                    <th className="px-4 py-3">Route</th>
                    <th className="px-4 py-3">Driver</th>
                    {isAdmin ? <th className="px-4 py-3">Vendor</th> : null}
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="px-4 py-8 text-center text-slate-500">
                        No trips found.
                      </td>
                    </tr>
                  ) : (
                    rows.map((trip) => (
                      <tr key={trip._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-900">{trip.leadId}</p>
                          <p className="text-[11px] text-muted">
                            {trip.customerName} · {formatDate(trip.travelDate)}{" "}
                            {displayPickupTime(trip.pickupTime)}
                          </p>
                        </td>
                        <td className="max-w-[14rem] px-4 py-3 text-slate-600">
                          <p className="truncate" title={trip.pickupLocation}>
                            {trip.pickupLocation}
                          </p>
                          <p className="truncate text-xs text-slate-400" title={trip.dropLocation}>
                            → {trip.dropLocation}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          {trip.assignedDriver ? (
                            <>
                              <p className="font-medium text-slate-800">{trip.assignedDriver.name}</p>
                              <p className="text-[11px] text-muted">{trip.assignedDriver.driverId}</p>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        {isAdmin ? (
                          <td className="px-4 py-3 text-slate-600">
                            {trip.assignedVendor?.companyName || "—"}
                          </td>
                        ) : null}
                        <td className="px-4 py-3 font-medium">{moneyInr(trip.grandTotal || 0)}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              trip.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            )}
                          >
                            {leadStatusLabel(trip.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {trip.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() => openInvoice(trip)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              {trip.invoiceId || "View"}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              pages={pages}
              limit={limit}
              total={total}
              onPage={setPage}
              onLimit={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
