import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Ban, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager, pageSize } from "../../components/ui/Pager";
import {
  leadService,
  LEAD_SOURCES,
  leadSourceLabel,
  leadStatusLabel,
  displayPickupTime,
} from "../../services/leadService";
import { cn } from "../../utils/cn";

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const emptyFilters = {
  search: "",
  leadSource: "",
  cancelledBy: "",
  cancelledFrom: "",
  cancelledTo: "",
  travelFrom: "",
  travelTo: "",
};

export function CancelledBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const load = async () => {
    try {
      setLoading(true);
      const res = await leadService.cancelled({
        page,
        limit: pageSize(limit, 20),
        search: filters.search || undefined,
        leadSource: filters.leadSource || undefined,
        cancelledBy: filters.cancelledBy || undefined,
        cancelledFrom: filters.cancelledFrom || undefined,
        cancelledTo: filters.cancelledTo || undefined,
        travelFrom: filters.travelFrom || undefined,
        travelTo: filters.travelTo || undefined,
        sortBy: "cancelledAt",
        sortOrder: "desc",
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load cancelled bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    limit,
    filters.leadSource,
    filters.cancelledFrom,
    filters.cancelledTo,
    filters.travelFrom,
    filters.travelTo,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.cancelledBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard/leads"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to leads
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
              <Ban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="ui-page-title">
                Cancelled bookings
              </h1>
              <p className="text-sm text-slate-500">
                Reason, who cancelled, designation, and time — with filters & pagination.
              </p>
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search lead, customer, mobile, reason…"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <Input
          placeholder="Cancelled by name / designation"
          value={filters.cancelledBy}
          onChange={(e) => setFilter("cancelledBy", e.target.value)}
        />
        <select
          className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
          value={filters.leadSource}
          onChange={(e) => setFilter("leadSource", e.target.value)}
        >
          <option value="">All sources</option>
          {LEAD_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Cancelled from</label>
          <Input
            type="date"
            value={filters.cancelledFrom}
            onChange={(e) => setFilter("cancelledFrom", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Cancelled to</label>
          <Input
            type="date"
            value={filters.cancelledTo}
            onChange={(e) => setFilter("cancelledTo", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Travel from</label>
          <Input
            type="date"
            value={filters.travelFrom}
            onChange={(e) => setFilter("travelFrom", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Travel to</label>
          <Input
            type="date"
            value={filters.travelTo}
            onChange={(e) => setFilter("travelTo", e.target.value)}
          />
        </div>
      </div>

      <div className="ui-table-wrap">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading cancelled bookings…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No cancelled bookings found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Trip</th>
                  <th className="px-4 py-3">Cancelled by</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="align-top hover:bg-slate-50/80">
                    <td className="px-3 py-2.5">
                      <Link
                        to={`/dashboard/leads/${row._id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {row.leadId}
                      </Link>
                      <p className="font-medium text-slate-900">{row.customerName}</p>
                      <p className="text-[11px] text-muted">{row.mobileNumber}</p>
                      <p className="mt-1 text-[10px] uppercase text-slate-400">
                        {leadSourceLabel(row.leadSource)}
                        {row.statusBeforeCancel
                          ? ` · was ${leadStatusLabel(row.statusBeforeCancel)}`
                          : ""}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-slate-800">
                        {row.pickupLocation} → {row.dropLocation}
                      </p>
                      <p className="text-[11px] text-muted">
                        {formatDate(row.travelDate)} · {displayPickupTime(row.pickupTime)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-slate-900">
                        {row.cancelledByName || row.cancelledBy?.name || "—"}
                      </p>
                      <p className="text-xs text-slate-600">
                        {row.cancelledByDesignation || "—"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {row.cancelledByEmail || row.cancelledBy?.email || ""}
                      </p>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="whitespace-pre-wrap text-slate-800">
                        {row.cancellationReason || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                      {formatDateTime(row.cancelledAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
  );
}
