import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import {
  leadService,
  leadStatusLabel,
  leadStatusColor,
  displayPickupTime,
} from "../../services/leadService";
import { moneyInr } from "../../services/quotationService";
import { cn } from "../../utils/cn";
import { Can } from "../../components/auth/Can";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function RepeatCustomers() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [minTrips, setMinTrips] = useState("1");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const [selectedMobile, setSelectedMobile] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const res = await leadService.repeatCustomers({
        page,
        limit,
        search: search || undefined,
        minTrips: minTrips || 1,
        sort: "lastTravelDate:desc",
      });
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, limit, minTrips]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openDetail = async (mobileKey) => {
    try {
      setSelectedMobile(mobileKey);
      setDetailLoading(true);
      const res = await leadService.repeatCustomer(mobileKey);
      setDetail(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load customer");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const startNewTrip = (mobile) => {
    navigate(`/dashboard/leads/create?fromMobile=${encodeURIComponent(mobile)}`);
  };

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
          <h1 className="ui-page-title">Repeat customers</h1>
          <p className="ui-page-subtitle">
            Search past clients, view trip history, and book a new trip with saved details.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-3 ui-filter-bar sm:flex-row sm:flex-wrap">
        <div className="relative min-w-[16rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search name, mobile, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          value={minTrips}
          onChange={(e) => {
            setMinTrips(e.target.value);
            setPage(1);
          }}
        >
          <option value="1">All customers (1+ trip)</option>
          <option value="2">Repeat only (2+ trips)</option>
          <option value="3">3+ trips</option>
          <option value="5">5+ trips</option>
        </select>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="ui-table-wrap lg:col-span-3">
          <div className="overflow-x-auto">
            <table className="ui-table text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Trips</th>
                  <th className="px-4 py-3">Last trip</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.mobileKey}
                      className={cn(
                        "cursor-pointer hover:bg-slate-50",
                        selectedMobile === row.mobileKey && "bg-primary-light/60"
                      )}
                      onClick={() => openDetail(row.mobileKey)}
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">{row.customerName || "—"}</p>
                        <p className="text-[11px] text-muted">{row.mobileNumber}</p>
                        {row.email ? (
                          <p className="text-xs text-slate-400">{row.email}</p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800">{row.totalTrips} total</p>
                        <p className="text-xs text-emerald-700">{row.completedTrips} completed</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{formatDate(row.lastTravelDate)}</p>
                        <p className="max-w-[12rem] truncate text-xs text-slate-400">
                          {row.lastPickup} → {row.lastDrop}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Can permission="leads.create">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => startNewTrip(row.mobileKey)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            New trip
                          </Button>
                        </Can>
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

        <div className="ui-filter-bar lg:col-span-2">
          {!selectedMobile ? (
            <div className="flex h-full min-h-[16rem] flex-col items-center justify-center text-center text-slate-500">
              <Users className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm">Select a customer to see trip history.</p>
            </div>
          ) : detailLoading ? (
            <p className="py-10 text-center text-sm text-slate-500">Loading history…</p>
          ) : !detail ? (
            <p className="py-10 text-center text-sm text-slate-500">Could not load customer.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{detail.customerName}</h2>
                  <p className="text-sm text-slate-500">{detail.mobileNumber}</p>
                  {detail.email ? (
                    <p className="text-xs text-slate-400">{detail.email}</p>
                  ) : null}
                </div>
                <Can permission="leads.create">
                  <Button type="button" size="sm" onClick={() => startNewTrip(detail.mobileKey)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    New trip
                  </Button>
                </Can>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Total trips" value={detail.summary?.totalTrips || 0} />
                <Stat label="Completed" value={detail.summary?.completedTrips || 0} />
                <Stat label="Lost" value={detail.summary?.lostTrips || 0} />
                <Stat label="Spend" value={moneyInr(detail.summary?.totalSpend || 0)} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Trip history
                </p>
                <ul className="max-h-[28rem] space-y-2 overflow-y-auto">
                  {(detail.trips || []).map((trip) => (
                    <li
                      key={trip._id}
                      className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          to={`/dashboard/leads/${trip._id}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {trip.leadId}
                        </Link>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                            leadStatusColor(trip.status)
                          )}
                        >
                          {leadStatusLabel(trip.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        {formatDate(trip.travelDate)} · {displayPickupTime(trip.pickupTime)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {trip.pickupLocation} → {trip.dropLocation}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-800">
                        {moneyInr(trip.grandTotal || 0)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
