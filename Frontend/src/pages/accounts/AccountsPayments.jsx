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
  method: "",
  purpose: "",
});

export function AccountsPayments() {
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
      method: filters.method || undefined,
      purpose: filters.purpose || undefined,
      page,
      limit,
    }),
    [from, to, vendorId, filters, page, limit]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountsService.payments(params);
      setRows(res.data.data || []);
      setTotal(res.data.pagination?.total || 0);
      setPages(res.data.pagination?.pages || 1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payments");
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
        pageKey="payments"
        title="Payments ledger"
        subtitle="Every collected payment with method, purpose and Razorpay / reference ids."
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
            placeholder="Search lead, customer, payment id, reference..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.method}
          onChange={(e) => setFilter("method", e.target.value)}
        >
          <option value="">All methods</option>
          <option value="RAZORPAY">Razorpay</option>
          <option value="CASH">Cash</option>
          <option value="QR">QR</option>
        </select>
        <select
          className="h-9 rounded-lg border border-slate-200 px-3 text-sm"
          value={filters.purpose}
          onChange={(e) => setFilter("purpose", e.target.value)}
        >
          <option value="">All purposes</option>
          <option value="ADVANCE">Advance</option>
          <option value="FINAL">Final</option>
          <option value="OTHER">Other</option>
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
          <EmptyState text="Loading payments..." />
        ) : !rows.length ? (
          <EmptyState text="No payments for these filters." />
        ) : (
          <table className="ui-table text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Txn / Ref</th>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Vendor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={`${r.leadMongoId}-${r.razorpayPaymentId || r._id || idx}`} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.paidAt
                      ? new Date(r.paidAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      to={`/dashboard/leads/${r.leadMongoId}`}
                      className="font-semibold text-blue-700 hover:underline"
                    >
                      {r.leadId}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">{r.customerName}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{r.method}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.purpose}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums text-emerald-700">{moneyInr(r.amount)}</td>
                  <td
                    className="max-w-[140px] truncate px-4 py-3 text-[11px] text-muted"
                    title={r.razorpayPaymentId || r.reference}
                  >
                    {r.razorpayPaymentId || r.reference || "—"}
                  </td>
                  <td className="max-w-[120px] truncate px-4 py-3 text-[11px] text-muted" title={r.razorpayOrderId}>
                    {r.razorpayOrderId || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.vendor?.companyName || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TableShell>
    </div>
  );
}
