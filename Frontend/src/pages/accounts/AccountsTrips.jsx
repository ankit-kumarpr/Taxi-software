import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "../../components/ui/Input";
import { Pager } from "../../components/ui/Pager";
import {
  accountsService,
  moneyInr,
  defaultAccountsRange,
} from "../../services/accountsService";
import { leadStatusLabel } from "../../services/leadService";
import {
  AccountsHero,
  FilterPanel,
  TableShell,
  EmptyState,
  useVendorOptions,
} from "./AccountsShared";

const empty = () => ({
  search: "",
  status: "",
  travelFrom: "",
  travelTo: "",
  amountMin: "",
  amountMax: "",
  collection: "",
  sort: "confirmedAt:desc",
});

export function AccountsTrips() {
  const initial = defaultAccountsRange();
  const vendors = useVendorOptions();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [vendorId, setVendorId] = useState("");
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
      vendorId: vendorId || undefined,
      search: filters.search || undefined,
      status: filters.status || undefined,
      travelFrom: filters.travelFrom || undefined,
      travelTo: filters.travelTo || undefined,
      amountMin: filters.amountMin || undefined,
      amountMax: filters.amountMax || undefined,
      pendingOnly: filters.collection === "pending" ? "1" : undefined,
      collectedOnly: filters.collection === "collected" ? "1" : undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    };
  }, [from, to, vendorId, filters, page, limit]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountsService.trips(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load trips");
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
        pageKey="trips"
        title="Trip ledger"
        subtitle="Every billed trip with GST, collection, company take and vendor payout."
        from={from}
        to={to}
        vendorId={vendorId}
        onFrom={(v) => {
          setFrom(v);
          setPage(1);
        }}
        onTo={(v) => {
          setTo(v);
          setPage(1);
        }}
        onVendor={(v) => {
          setVendorId(v);
          setPage(1);
        }}
        onRefresh={load}
        vendors={vendors}
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
            placeholder="Search lead, customer, mobile, route..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All billed statuses</option>
          {[
            "CONFIRMED",
            "VENDOR_OFFERED",
            "VENDOR_ACCEPTED",
            "DRIVER_ASSIGNED",
            "TRIP_STARTED",
            "PAYMENT_PENDING",
            "COMPLETED",
          ].map((s) => (
            <option key={s} value={s}>
              {leadStatusLabel(s)}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.collection}
          onChange={(e) => setFilter("collection", e.target.value)}
        >
          <option value="">All collection states</option>
          <option value="pending">Pending only</option>
          <option value="collected">Fully collected</option>
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.sort}
          onChange={(e) => setFilter("sort", e.target.value)}
        >
          <option value="confirmedAt:desc">Newest confirmed</option>
          <option value="grandTotal:desc">Amount high → low</option>
          <option value="grandTotal:asc">Amount low → high</option>
          <option value="pendingAmount:desc">Pending high → low</option>
          <option value="travelDate:asc">Travel date ↑</option>
          <option value="travelDate:desc">Travel date ↓</option>
        </select>
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
          Min billed ₹
          <Input
            type="number"
            min="0"
            className="mt-1"
            value={filters.amountMin}
            onChange={(e) => setFilter("amountMin", e.target.value)}
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Max billed ₹
          <Input
            type="number"
            min="0"
            className="mt-1"
            value={filters.amountMax}
            onChange={(e) => setFilter("amountMax", e.target.value)}
          />
        </label>
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
          <EmptyState text="Loading trips..." />
        ) : !rows.length ? (
          <EmptyState text="No billed trips for these filters." />
        ) : (
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Billed</th>
                <th className="px-4 py-3">GST</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5">
                    <Link to={`/dashboard/leads/${r._id}`} className="font-semibold text-blue-700 hover:underline">
                      {r.leadId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{r.customerName}</div>
                    <div className="text-[11px] text-muted">{r.mobileNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{leadStatusLabel(r.status)}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">{moneyInr(r.grandTotal)}</td>
                  <td className="px-4 py-3 tabular-nums text-teal-700">{moneyInr(r.gstAmount)}</td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700">{moneyInr(r.advancePaid)}</td>
                  <td className="px-4 py-3 tabular-nums text-rose-700">{moneyInr(r.pendingAmount)}</td>
                  <td className="px-4 py-3 tabular-nums text-blue-700">{moneyInr(r.companyTake)}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.assignedVendor?.companyName || "—"}</td>
                  <td className="px-4 py-3 tabular-nums text-amber-700">{moneyInr(r.vendorPayout)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
}
