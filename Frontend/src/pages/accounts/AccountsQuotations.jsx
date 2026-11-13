import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import { cn } from "../../utils/cn";
import {
  accountsService,
  moneyInr,
  defaultAccountsRange,
} from "../../services/accountsService";
import { AccountsHero, FilterPanel, TableShell, EmptyState } from "./AccountsShared";

const empty = () => ({
  search: "",
  status: "",
  sort: "createdAt:desc",
});

export function AccountsQuotations() {
  const initial = defaultAccountsRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [filters, setFilters] = useState(empty);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const setFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const params = useMemo(() => {
    const [sortBy, sortOrder] = String(filters.sort).split(":");
    return {
      from: from || undefined,
      to: to || undefined,
      search: filters.search || undefined,
      status: filters.status || undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    };
  }, [from, to, filters, page, limit]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountsService.quotations(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <AccountsHero
        pageKey="quotations"
        title="Quotations"
        subtitle="Draft and sent quotations with trip amount, GST and grand total."
        from={from}
        to={to}
        onFrom={(v) => {
          setFrom(v);
          setPage(1);
        }}
        onTo={(v) => {
          setTo(v);
          setPage(1);
        }}
        onRefresh={load}
      />

      <FilterPanel
        onClear={() => {
          setFilters(empty());
          setPage(1);
        }}
      >
        <div className="relative xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Search quotation id, customer, mobile..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="SENT">Sent</option>
          <option value="DRAFT">Draft</option>
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value)}
        >
          <option value="createdAt:desc">Newest</option>
          <option value="sentAt:desc">Recently sent</option>
          <option value="grandTotal:desc">Total high → low</option>
          <option value="gstAmount:desc">GST high → low</option>
          <option value="tripAmount:desc">Trip high → low</option>
        </select>
      </FilterPanel>

      <TableShell
        pager={
          <Pager
            page={page}
            pages={pages}
            limit={limit}
            total={total}
            onPage={setPage}
            onLimit={(size) => {
              setLimit(size);
              setPage(1);
            }}
          />
        }
      >
        {loading ? (
          <EmptyState text="Loading quotations..." />
        ) : !rows.length ? (
          <EmptyState text="No quotations for these filters." />
        ) : (
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quotation</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">GST %</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Sent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q._id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    {q.lead?._id ? (
                      <Link
                        to={`/dashboard/leads/${q.lead._id}/quotations/${q._id}`}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        {q.quotationId}
                      </Link>
                    ) : (
                      <span className="font-semibold">{q.quotationId}</span>
                    )}
                    <div className="text-[11px] text-muted">{q.lead?.leadId}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div>{q.customerName}</div>
                    <div className="text-[11px] text-muted">{q.mobileNumber}</div>
                  </td>
                  <td className="max-w-[160px] px-4 py-3 text-xs text-slate-600">
                    <div className="truncate">{q.pickupLocation}</div>
                    <div className="truncate text-slate-400">→ {q.dropLocation}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        q.status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{moneyInr(q.tripAmount)}</td>
                  <td className="px-4 py-3 tabular-nums">{q.gstPercent ?? 0}%</td>
                  <td className="px-4 py-3 tabular-nums text-teal-700">{moneyInr(q.gstAmount)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{moneyInr(q.grandTotal)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {q.sentAt
                      ? new Date(q.sentAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
}
