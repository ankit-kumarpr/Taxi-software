import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { ACCOUNTS_PAGES } from "../../services/accountsService";
import { vendorService } from "../../services/vendorService";

export function StatTile({ label, value, hint, tone = "slate", icon: Icon }) {
  const tones = {
    slate: "border-slate-200 bg-white",
    blue: "border-blue-100 bg-gradient-to-br from-white to-blue-50/80",
    emerald: "border-emerald-100 bg-gradient-to-br from-white to-emerald-50/80",
    amber: "border-amber-100 bg-gradient-to-br from-white to-amber-50/70",
    rose: "border-rose-100 bg-gradient-to-br from-white to-rose-50/80",
    teal: "border-teal-100 bg-gradient-to-br from-white to-teal-50/80",
  };
  const iconTone = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-600 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    rose: "bg-rose-500 text-white",
    teal: "bg-teal-600 text-white",
  };

  return (
    <div className={cn("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
          {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconTone[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MiniBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="tabular-nums text-slate-800">
          {Number(value || 0).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}{" "}
          · {pct}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function useVendorOptions() {
  const [vendors, setVendors] = useState([]);
  useEffect(() => {
    vendorService
      .list({ limit: 100, status: "ACTIVE" })
      .then((res) => setVendors(res.data.data || []))
      .catch(() => setVendors([]));
  }, []);
  return vendors;
}

export function AccountsHero({
  title,
  subtitle,
  pageKey,
  from,
  to,
  vendorId,
  onFrom,
  onTo,
  onVendor,
  onRefresh,
  vendors,
  extra,
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white shadow-lg">
      <div className="relative px-5 py-6 sm:px-8 sm:py-7">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">Accounts</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-slate-300">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[11px] font-medium text-slate-300">
              Page
              <select
                className="mt-1 h-9 min-w-[160px] rounded-lg border border-white/10 bg-white/10 px-2 text-sm text-white"
                value={pageKey}
                onChange={(e) => {
                  const page = ACCOUNTS_PAGES.find((p) => p.key === e.target.value);
                  if (page) navigate(page.href);
                }}
              >
                {ACCOUNTS_PAGES.map((p) => (
                  <option key={p.key} value={p.key} className="text-slate-900">
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-slate-300">
              From
              <Input
                type="date"
                className="mt-1 w-[140px] border-white/10 bg-white/10 text-white"
                value={from}
                onChange={(e) => onFrom?.(e.target.value)}
              />
            </label>
            <label className="text-[11px] font-medium text-slate-300">
              To
              <Input
                type="date"
                className="mt-1 w-[140px] border-white/10 bg-white/10 text-white"
                value={to}
                onChange={(e) => onTo?.(e.target.value)}
              />
            </label>
            {onVendor ? (
              <label className="text-[11px] font-medium text-slate-300">
                Vendor
                <select
                  className="mt-1 h-9 w-[170px] rounded-lg border border-white/10 bg-white/10 px-2 text-sm text-white"
                  value={vendorId}
                  onChange={(e) => onVendor(e.target.value)}
                >
                  <option value="" className="text-slate-900">
                    All vendors
                  </option>
                  {(vendors || []).map((v) => (
                    <option key={v._id} value={v._id} className="text-slate-900">
                      {v.companyName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {extra}
            {onRefresh ? (
              <Button
                variant="secondary"
                className="h-9 bg-white text-slate-900 hover:bg-slate-100"
                onClick={onRefresh}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FilterPanel({ children, onClear }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{children}</div>
      {onClear ? (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function TableShell({ children, pager }) {
  return (
    <div className="ui-table-wrap">
      <div className="overflow-x-auto">{children}</div>
      {pager}
    </div>
  );
}

export function EmptyState({ text }) {
  return <div className="px-6 py-12 text-center text-sm text-slate-500">{text}</div>;
}
