import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, Filter, Gavel, Search, Timer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Pager, pageSize } from "../../components/ui/Pager";
import { cn } from "../../utils/cn";
import {
  ADMIN_BID_STATUSES,
  bidListHref,
  bidService,
  formatCountdown,
  moneyInr,
} from "../../services/bidService";
import { useBidCounts } from "../../context/BidCountsContext";
import { Can } from "../../components/auth/Can";
import { getSocket } from "../../utils/socket";

const statusStyle = {
  OPEN: "bg-amber-100 text-amber-900",
  CLOSED: "bg-emerald-100 text-emerald-800",
  EXPIRED: "bg-red-50 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const SORT_OPTIONS = [
  { value: "expiresAt:asc", label: "Time left ↑" },
  { value: "expiresAt:desc", label: "Time left ↓" },
  { value: "maxBidAmount:asc", label: "Max bid ↑" },
  { value: "maxBidAmount:desc", label: "Max bid ↓" },
  { value: "createdAt:desc", label: "Newest" },
  { value: "createdAt:asc", label: "Oldest" },
  { value: "travelDate:asc", label: "Travel date ↑" },
  { value: "travelDate:desc", label: "Travel date ↓" },
  { value: "roundId:asc", label: "Round ID A–Z" },
];

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function AdminLiveBids() {
  const { status: statusParam } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refresh: refreshCounts } = useBidCounts();

  const lockedStatus = useMemo(() => {
    if (!statusParam) return "ALL";
    const ok = ADMIN_BID_STATUSES.some((s) => s.value === statusParam);
    return ok ? statusParam : "ALL";
  }, [statusParam]);

  const pageMeta = useMemo(() => {
    if (lockedStatus === "ALL") {
      return { title: "All Bids", subtitle: "Every bid round with filters and pagination." };
    }
    const label = ADMIN_BID_STATUSES.find((s) => s.value === lockedStatus)?.label || lockedStatus;
    return { title: `${label} bids`, subtitle: `Rounds currently in “${label}”.` };
  }, [lockedStatus]);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");
  const [expanded, setExpanded] = useState({});
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [, setTick] = useState(0);

  const [draft, setDraft] = useState({
    search: searchParams.get("q") || "",
    minAmount: searchParams.get("minAmount") || "",
    maxAmount: searchParams.get("maxAmount") || "",
  });
  const [applied, setApplied] = useState(draft);
  const [sort, setSort] = useState(
    searchParams.get("sort") ||
      (lockedStatus === "OPEN" ? "expiresAt:asc" : "createdAt:desc")
  );
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [limit, setLimit] = useState(pageSize(searchParams.get("limit"), 10));
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const toggleRow = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const syncUrl = useCallback(
    (next) => {
      const params = new URLSearchParams();
      if (next.search) params.set("q", next.search);
      if (next.minAmount) params.set("minAmount", next.minAmount);
      if (next.maxAmount) params.set("maxAmount", next.maxAmount);
      if (next.sort) params.set("sort", next.sort);
      if (next.page > 1) params.set("page", String(next.page));
      if (next.limit !== 10) params.set("limit", String(next.limit));
      setSearchParams(params, { replace: true });
    },
    [setSearchParams]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bidService.listRounds({
        status: lockedStatus,
        page,
        limit,
        search: applied.search || undefined,
        minAmount: applied.minAmount || undefined,
        maxAmount: applied.maxAmount || undefined,
        sort,
      });
      setRows(res.data.data || []);
      setTotal(Number(res.data.total) || 0);
      setTotalPages(Number(res.data.totalPages) || 1);
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load bids");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [lockedStatus, page, limit, applied, sort, refreshCounts]);

  useEffect(() => {
    setPage(1);
    setExpanded({});
  }, [lockedStatus]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    syncUrl({
      search: applied.search,
      minAmount: applied.minAmount,
      maxAmount: applied.maxAmount,
      sort,
      page,
      limit,
    });
  }, [applied, sort, page, limit, syncUrl]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (lockedStatus !== "OPEN" && lockedStatus !== "ALL") return undefined;
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [lockedStatus, load]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;
    const refresh = () => {
      load();
      refreshCounts();
    };
    s.on("bid:opened", refresh);
    s.on("bid:placed", refresh);
    s.on("bid:accepted", refresh);
    s.on("bid:expired", refresh);
    return () => {
      s.off("bid:opened", refresh);
      s.off("bid:placed", refresh);
      s.off("bid:accepted", refresh);
      s.off("bid:expired", refresh);
    };
  }, [load, refreshCounts]);

  const acceptBid = async (bid) => {
    if (!window.confirm(`Accept ${bid.vendor?.companyName} at ${moneyInr(bid.amount)}?`)) return;
    try {
      setActing(bid._id);
      const res = await bidService.accept(bid._id);
      toast.success(res.data.message || "Bid accepted");
      load();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Accept failed");
    } finally {
      setActing("");
    }
  };

  const cancelRound = async (round) => {
    if (!window.confirm(`Cancel bid round ${round.roundId}?`)) return;
    try {
      setActing(round._id);
      await bidService.cancelRound(round._id);
      toast.success("Bid cancelled");
      load();
      refreshCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancel failed");
    } finally {
      setActing("");
    }
  };

  const applyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({ ...draft });
    setPage(1);
  };

  const clearFilters = () => {
    const empty = { search: "", minAmount: "", maxAmount: "" };
    setDraft(empty);
    setApplied(empty);
    setSort(lockedStatus === "OPEN" ? "expiresAt:asc" : "createdAt:desc");
    setPage(1);
    setLimit(10);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="ui-page-title">{pageMeta.title}</h1>
            <p className="text-sm text-slate-500">{pageMeta.subtitle}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          Use sidebar for Open / Closed / … · {total} matching
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                placeholder="Round ID, route, cab…"
                value={draft.search}
                onChange={(e) => setDraft((d) => ({ ...d, search: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Min max-bid (₹)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 1000"
              value={draft.minAmount}
              onChange={(e) => setDraft((d) => ({ ...d, minAmount: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Max max-bid (₹)</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 5000"
              value={draft.maxAmount}
              onChange={(e) => setDraft((d) => ({ ...d, maxAmount: e.target.value }))}
            />
          </div>
        </div>

        {showMoreFilters ? (
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Sort</label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Jump status (or use sidebar)
              </label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={lockedStatus}
                onChange={(e) => {
                  navigate(bidListHref(e.target.value === "ALL" ? "" : e.target.value));
                }}
              >
                <option value="ALL">All</option>
                {ADMIN_BID_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">Apply</Button>
          <Button type="button" variant="outline" onClick={clearFilters}>
            Clear
          </Button>
          <button
            type="button"
            onClick={() => setShowMoreFilters((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <Filter className="h-4 w-4" />
            {showMoreFilters ? "Less filters" : "More filters"}
          </button>
        </div>
      </form>

      <div className="ui-table-wrap">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading bid rounds…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No bid rounds match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3" />
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Travel</th>
                  <th className="px-4 py-3">Max bid</th>
                  <th className="px-4 py-3">Bids</th>
                  <th className="px-4 py-3">Time left</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((round) => {
                  const left = Math.max(0, new Date(round.expiresAt).getTime() - Date.now());
                  const open = round.status === "OPEN" && left > 0;
                  const leadMongoId = round.lead?._id || round.lead;
                  const isOpen = Boolean(expanded[round._id]);
                  const sortedBids = [...(round.bids || [])].sort((a, b) => a.amount - b.amount);

                  return (
                    <Fragment key={round._id}>
                      <tr className={cn(isOpen && "bg-amber-50/40")}>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => toggleRow(round._id)}
                            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Show vendor bids"
                          >
                            <ChevronDown
                              className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                            />
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                          {round.roundId}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {round.lead?.leadId ? (
                            <Link
                              to={`/dashboard/leads/${leadMongoId}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {round.lead.leadId}
                            </Link>
                          ) : (
                            "—"
                          )}
                          {round.lead?.customerName ? (
                            <p className="text-[11px] text-muted">{round.lead.customerName}</p>
                          ) : null}
                        </td>
                        <td className="max-w-[14rem] px-4 py-3 text-slate-700">
                          <span className="line-clamp-2">
                            {round.pickupLocation} → {round.dropLocation}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(round.travelDate)}
                          <p className="text-xs text-slate-400">
                            {round.pickupTime} · {round.cabTypeName || "Cab"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-amber-800">
                          {moneyInr(round.maxBidAmount)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {round.bidCount || 0}
                          {round.lowestBid != null ? (
                            <p className="text-xs text-slate-400">low {moneyInr(round.lowestBid)}</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {open ? (
                            <span className="inline-flex items-center gap-1 font-bold tabular-nums text-slate-800">
                              <Timer className="h-3.5 w-3.5" />
                              {formatCountdown(left)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                              statusStyle[round.status] || statusStyle.CANCELLED
                            )}
                          >
                            {round.status}
                          </span>
                          {round.winningVendor?.companyName ? (
                            <p className="mt-1 text-xs text-emerald-700">
                              {round.winningVendor.companyName}
                            </p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => toggleRow(round._id)}
                            >
                              {isOpen ? "Hide" : "Bids"}
                            </Button>
                            {open ? (
                              <Can permission={["bids.cancel", "leads.cancel_bid"]}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={acting === round._id}
                                  onClick={() => cancelRound(round)}
                                >
                                  Cancel
                                </Button>
                              </Can>
                            ) : null}
                          </div>
                        </td>
                      </tr>

                      {isOpen ? (
                        <tr className="">
                          <td colSpan={10} className="px-4 py-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Vendor bids — {round.roundId}
                            </p>
                            {!sortedBids.length ? (
                              <p className="text-sm text-slate-500">
                                {open ? "Waiting for vendor bids…" : "No bids placed."}
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="ui-table text-sm">
                                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2">#</th>
                                      <th className="px-3 py-2">Vendor</th>
                                      <th className="px-3 py-2">Amount</th>
                                      <th className="px-3 py-2">Placed</th>
                                      <th className="px-3 py-2">Status</th>
                                      <th className="px-3 py-2">Action</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sortedBids.map((b, idx) => (
                                      <tr key={b._id}>
                                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-slate-900">
                                          {b.vendor?.companyName || "Vendor"}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-amber-800">
                                          {moneyInr(b.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600">
                                          {b.placedAt
                                            ? new Date(b.placedAt).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                              })
                                            : "—"}
                                        </td>
                                        <td className="px-3 py-2 text-xs uppercase text-slate-500">
                                          {b.status}
                                        </td>
                                        <td className="px-3 py-2">
                                          {open && b.status === "ACTIVE" ? (
                                            <Can permission={["bids.accept", "leads.accept_bid"]}>
                                              <Button
                                                size="sm"
                                                disabled={acting === b._id}
                                                onClick={() => acceptBid(b)}
                                              >
                                                Accept
                                              </Button>
                                            </Can>
                                          ) : (
                                            "—"
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
    </div>
  );
}
