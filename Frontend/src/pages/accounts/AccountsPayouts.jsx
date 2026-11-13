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
import {
  AccountsHero,
  FilterPanel,
  TableShell,
  EmptyState,
  useVendorOptions,
} from "./AccountsShared";

const empty = () => ({
  search: "",
  status: "ACCEPTED",
});

export function AccountsPayouts() {
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

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      vendorId: vendorId || undefined,
      search: filters.search || undefined,
      status: filters.status || undefined,
      page,
      limit,
    }),
    [from, to, vendorId, filters, page, limit]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountsService.vendorPayouts(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payouts");
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
        pageKey="payouts"
        title="Vendor payouts"
        subtitle="Option B split — company share vs vendor payout per accepted offer."
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
            placeholder="Search offer id, pickup, drop..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="ACCEPTED">Accepted</option>
          <option value="OFFERED">Offered</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="">All statuses</option>
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
          <EmptyState text="Loading payouts..." />
        ) : !rows.length ? (
          <EmptyState text="No vendor offers for these filters." />
        ) : (
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trip amt</th>
                <th className="px-4 py-3">Company %</th>
                <th className="px-4 py-3">Company share</th>
                <th className="px-4 py-3">Vendor payout</th>
                <th className="px-4 py-3">Company take*</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o._id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-semibold text-slate-900">{o.offerId}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{o.vendor?.companyName}</div>
                    <div className="text-[11px] text-muted">{o.vendor?.vendorId}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    {o.lead?._id ? (
                      <Link to={`/dashboard/leads/${o.lead._id}`} className="text-blue-700 hover:underline">
                        {o.lead.leadId}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium">{o.status}</td>
                  <td className="px-4 py-3 tabular-nums">{moneyInr(o.tripAmount)}</td>
                  <td className="px-4 py-3 tabular-nums">{o.companySharePercent ?? "—"}%</td>
                  <td className="px-4 py-3 tabular-nums text-blue-700">{moneyInr(o.companyShareAmount)}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-amber-700">
                    {moneyInr(o.vendorPayout)}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-emerald-700">{moneyInr(o.companyTake)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>
      <p className="text-[11px] text-muted">* Company take = company share + GST on that trip.</p>
    </div>
  );
}
