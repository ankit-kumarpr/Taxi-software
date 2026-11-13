import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Eye, PhoneCall, Filter, Repeat2, Ban } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { Pager } from "../../components/ui/Pager";
import {
  leadService,
  LEAD_SOURCES,
  LEAD_STATUSES,
  LEAD_LIST_PAGES,
  leadStatusLabel,
  leadSourceLabel,
  leadSourceColor,
  leadStatusColor,
  leadListHref,
  displayPickupTime,
  canCancelLeadStatus,
} from "../../services/leadService";
import { tripTypeService } from "../../services/tripTypeService";
import { carTypeService } from "../../services/carTypeService";
import { useLeadCounts } from "../../context/LeadCountsContext";
import { Can } from "../../components/auth/Can";
import { cn } from "../../utils/cn";
import toast from "react-hot-toast";

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest created" },
  { value: "createdAt:asc", label: "Oldest created" },
  { value: "travelDate:asc", label: "Travel date ↑" },
  { value: "travelDate:desc", label: "Travel date ↓" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "customerName:asc", label: "Customer A–Z" },
  { value: "leadId:asc", label: "Lead ID A–Z" },
  { value: "status:asc", label: "Status A–Z" },
];

const emptyFilters = () => ({
  search: "",
  status: "",
  leadSource: "",
  tripType: "",
  cabType: "",
  travelFrom: "",
  travelTo: "",
  createdFrom: "",
  createdTo: "",
  followUpFrom: "",
  followUpTo: "",
  sort: "createdAt:desc",
});

export function Leads() {
  const { status: statusParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh: refreshCounts } = useLeadCounts();

  const lockedStatus = useMemo(() => {
    if (!statusParam) return "";
    const ok = LEAD_STATUSES.some((s) => s.value === statusParam);
    return ok ? statusParam : "";
  }, [statusParam]);

  const pageMeta = useMemo(() => {
    if (!lockedStatus) {
      return { title: "All Leads", subtitle: "Search and filter every lead with pagination." };
    }
    return {
      title: leadStatusLabel(lockedStatus),
      subtitle: `Leads currently in “${leadStatusLabel(lockedStatus)}”.`,
    };
  }, [lockedStatus]);

  const [rows, setRows] = useState([]);
  const [tripTypes, setTripTypes] = useState([]);
  const [cabTypes, setCabTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(() => {
    const q = searchParams.get("q");
    return q ? { ...emptyFilters(), search: q } : emptyFilters();
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [cancelRow, setCancelRow] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (statusParam && !LEAD_STATUSES.some((s) => s.value === statusParam)) {
      toast.error("Invalid lead status");
      navigate("/dashboard/leads", { replace: true });
    }
  }, [statusParam, navigate]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setFilters({ ...emptyFilters(), search: q });
    setPage(1);
  }, [lockedStatus, searchParams]);

  useEffect(() => {
    tripTypeService
      .dropdown()
      .then((res) => setTripTypes(res.data.data || []))
      .catch(() => {});
    carTypeService
      .dropdown()
      .then((res) => setCabTypes(res.data.data || []))
      .catch(() => {});
  }, []);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const fetchList = async () => {
    try {
      setLoading(true);
      const [sortBy, sortOrder] = String(filters.sort || "createdAt:desc").split(":");
      const params = {
        search: filters.search || undefined,
        status: lockedStatus || filters.status || undefined,
        leadSource: filters.leadSource || undefined,
        tripType: filters.tripType || undefined,
        cabType: filters.cabType || undefined,
        travelFrom: filters.travelFrom || undefined,
        travelTo: filters.travelTo || undefined,
        createdFrom: filters.createdFrom || undefined,
        createdTo: filters.createdTo || undefined,
        followUpFrom: filters.followUpFrom || undefined,
        followUpTo: filters.followUpTo || undefined,
        sortBy,
        sortOrder,
        page,
        limit,
      };

      const res = await leadService.list(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedStatus, filters, page, limit]);

  const openCancel = (row) => {
    setCancelRow(row);
    setCancelReason("");
  };

  const submitCancel = async () => {
    if (!cancelRow?._id) return;
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Cancellation reason is required");
      return;
    }
    try {
      setCancelling(true);
      const res = await leadService.cancel(cancelRow._id, reason);
      toast.success(res.data.message || "Booking cancelled");
      setCancelRow(null);
      setCancelReason("");
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleStatusChange = async (row, status) => {
    if (status === row.status) return;
    if (status === "CANCELLED") {
      if (canCancelLeadStatus(row.status)) openCancel(row);
      else toast.error("Cannot cancel after pickup / trip start");
      return;
    }
    if (status === "CONFIRMED") {
      navigate(`/dashboard/leads/${row._id}`);
      toast("Confirm from lead page to record optional advance", { icon: "ℹ️" });
      return;
    }
    if (status === "QUOTATION_SEND") {
      navigate(`/dashboard/leads/${row._id}/quotations/create`);
      return;
    }
    try {
      await leadService.changeStatus(row._id, status);
      toast.success(`Lead marked ${leadStatusLabel(status)}`);
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete lead "${row.customerName}" (${row.leadId})?`)) return;
    try {
      await leadService.remove(row._id);
      toast.success("Lead deleted");
      fetchList();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete lead");
    }
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">{pageMeta.title}</h1>
          <p className="ui-page-subtitle">{pageMeta.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-select min-w-[180px]"
            value={lockedStatus}
            onChange={(e) => navigate(leadListHref(e.target.value))}
          >
            {LEAD_LIST_PAGES.map((p) => (
              <option key={p.href} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <Link to="/dashboard/leads/repeat-customers">
            <Button type="button" variant="outline">
              Repeat customers
            </Button>
          </Link>
          <Can permission="leads.create">
            <Link to="/dashboard/leads/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </Link>
          </Can>
        </div>
      </div>

      <div className="ui-filter-bar space-y-2.5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search name, mobile, lead ID, email, locations..."
              className="pl-8"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!lockedStatus ? (
              <select
                className={cn(
                  "ui-select w-auto min-w-[140px]",
                  filters.status && leadStatusColor(filters.status)
                )}
                value={filters.status}
                onChange={(e) => setFilter("status", e.target.value)}
              >
                <option value="">All Statuses</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : (
              <div
                className={cn(
                  "flex h-9 items-center rounded-lg px-3 text-sm font-medium",
                  leadStatusColor(lockedStatus)
                )}
              >
                {leadStatusLabel(lockedStatus)}
              </div>
            )}

            <select
              className={cn(
                "ui-select w-auto min-w-[130px]",
                filters.leadSource && leadSourceColor(filters.leadSource)
              )}
              value={filters.leadSource}
              onChange={(e) => setFilter("leadSource", e.target.value)}
            >
              <option value="">All Sources</option>
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              className="ui-select w-auto min-w-[130px]"
              value={filters.tripType}
              onChange={(e) => setFilter("tripType", e.target.value)}
            >
              <option value="">All Trip Types</option>
              {tripTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              className="ui-select w-auto min-w-[120px]"
              value={filters.cabType}
              onChange={(e) => setFilter("cabType", e.target.value)}
            >
              <option value="">All Cab Types</option>
              {cabTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>

            <select
              className="ui-select w-auto min-w-[140px]"
              value={filters.sort}
              onChange={(e) => setFilter("sort", e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowMoreFilters((v) => !v)}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {showMoreFilters ? "Hide dates" : "Date filters"}
            </Button>

            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </div>

        {showMoreFilters ? (
          <div className="grid gap-3 border-t border-slate-100 pt-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-medium text-slate-600">
              Travel from
              <Input
                type="date"
                className="mt-1"
                value={filters.travelFrom}
                onChange={(e) => setFilter("travelFrom", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Travel to
              <Input
                type="date"
                className="mt-1"
                value={filters.travelTo}
                onChange={(e) => setFilter("travelTo", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Created from
              <Input
                type="date"
                className="mt-1"
                value={filters.createdFrom}
                onChange={(e) => setFilter("createdFrom", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Created to
              <Input
                type="date"
                className="mt-1"
                value={filters.createdTo}
                onChange={(e) => setFilter("createdTo", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Next follow-up from
              <Input
                type="date"
                className="mt-1"
                value={filters.followUpFrom}
                onChange={(e) => setFilter("followUpFrom", e.target.value)}
              />
            </label>
            <label className="text-xs font-medium text-slate-600">
              Next follow-up to
              <Input
                type="date"
                className="mt-1"
                value={filters.followUpTo}
                onChange={(e) => setFilter("followUpTo", e.target.value)}
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="ui-table-wrap">
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Lead ID</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Customer</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Route</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Travel</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Source</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Next Follow-up</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted">Status</th>
                <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-muted">
                    Loading leads...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[13px] text-muted">
                    No leads found.{" "}
                    <Link to="/dashboard/leads/create" className="text-primary hover:underline">
                      Add one
                    </Link>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-primary">{row.leadId}</td>
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/dashboard/leads/${row._id}`}
                        className="text-[13px] font-medium text-navy hover:text-primary"
                      >
                        {row.customerName}
                      </Link>
                      <div className="text-[11px] text-muted">{row.mobileNumber}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">
                      <div className="max-w-[160px] truncate" title={row.pickupLocation}>
                        {row.pickupLocation}
                      </div>
                      <div className="max-w-[160px] truncate text-[11px] text-muted" title={row.dropLocation}>
                        → {row.dropLocation}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">
                      <div>
                        {row.travelDate
                          ? new Date(row.travelDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                        {row.endDate
                          ? ` → ${new Date(row.endDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}`
                          : ""}
                      </div>
                      <div className="text-[11px] text-muted">{displayPickupTime(row.pickupTime)}</div>
                      <div className="text-[11px] text-muted">
                        {row.tripType?.name || "—"} · {row.cabType?.name || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "ui-badge",
                          leadSourceColor(row.leadSource)
                        )}
                      >
                        {leadSourceLabel(row.leadSource)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-slate-600">
                      {row.nextFollowUpDate ? (
                        <>
                          <div>
                            {new Date(row.nextFollowUpDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          <div className="text-[11px] text-muted">{(row.followUps || []).length} logged</div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.status === "CANCELLED" ? (
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            leadStatusColor(row.status)
                          )}
                        >
                          {leadStatusLabel(row.status)}
                        </span>
                      ) : (
                        <select
                          className={cn(
                            "rounded-full border-0 px-2 py-0.5 text-xs font-medium focus:ring-1 focus:ring-primary",
                            leadStatusColor(row.status)
                          )}
                          value={row.status}
                          onChange={(e) => handleStatusChange(row, e.target.value)}
                        >
                          {LEAD_STATUSES.filter((s) => s.value !== "CANCELLED").map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Can permission="leads.followups">
                          <Link to={`/dashboard/leads/${row._id}/follow-ups/create`}>
                            <Button variant="ghost" size="icon" title="Add Follow-up">
                              <PhoneCall className="h-4 w-4 text-primary" />
                            </Button>
                          </Link>
                        </Can>
                        <Can permission="leads.view">
                          <Link to={`/dashboard/leads/${row._id}`}>
                            <Button variant="ghost" size="icon" title="View">
                              <Eye className="h-4 w-4 text-slate-500" />
                            </Button>
                          </Link>
                        </Can>
                        {canCancelLeadStatus(row.status) ? (
                          <Can permission="leads.cancel">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Cancel booking"
                              onClick={() => openCancel(row)}
                            >
                              <Ban className="h-4 w-4 text-rose-600" />
                            </Button>
                          </Can>
                        ) : null}
                        <Can permission="leads.create">
                          <Link to={`/dashboard/leads/create?fromLead=${row._id}`}>
                            <Button variant="ghost" size="icon" title="Repeat trip">
                              <Repeat2 className="h-4 w-4 text-teal-600" />
                            </Button>
                          </Link>
                        </Can>
                        <Can permission="leads.edit">
                          <Link to={`/dashboard/leads/${row._id}/edit`}>
                            <Button variant="ghost" size="icon" title="Edit">
                              <Edit2 className="h-4 w-4 text-slate-500" />
                            </Button>
                          </Link>
                        </Can>
                        <Can permission="leads.delete">
                          <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(row)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pager
          page={page}
          pages={totalPages}
          limit={limit}
          total={total}
          onPage={setPage}
          onLimit={(size) => {
            setLimit(size);
            setPage(1);
          }}
        />
      </div>

      <Modal
        open={Boolean(cancelRow)}
        onClose={() => {
          if (cancelling) return;
          setCancelRow(null);
          setCancelReason("");
        }}
        title="Cancel booking"
        description={
          cancelRow
            ? `${cancelRow.leadId} · ${cancelRow.customerName} — reason is required before pickup.`
            : "Reason is required before pickup."
        }
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => {
                setCancelRow(null);
                setCancelReason("");
              }}
            >
              Keep booking
            </Button>
            <Button
              type="button"
              disabled={cancelling || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={submitCancel}
            >
              <Ban className="mr-2 h-4 w-4" />
              {cancelling ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </>
        }
      >
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Cancellation reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-[110px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Customer requested cancel, duplicate booking…"
          disabled={cancelling}
          autoFocus
        />
      </Modal>
    </div>
  );
}
