import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Landmark,
  Receipt,
  Users,
  FileText,
  BadgeCheck,
  IndianRupee,
  PieChart,
  ArrowRightLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  accountsService,
  moneyInr,
  numIn,
  defaultAccountsRange,
} from "../../services/accountsService";
import { leadStatusLabel } from "../../services/leadService";
import {
  AccountsHero,
  StatTile,
  MiniBar,
  useVendorOptions,
} from "./AccountsShared";

export function AccountsOverview() {
  const initial = defaultAccountsRange();
  const vendors = useVendorOptions();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [vendorId, setVendorId] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      vendorId: vendorId || undefined,
    }),
    [from, to, vendorId]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await accountsService.summary(params);
      setSummary(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const money = summary?.money;
  const funnel = summary?.funnel;
  const collectedTotal = Number(money?.collected || 0);

  return (
    <div className="space-y-4">
      <AccountsHero
        pageKey="overview"
        title="Revenue overview"
        subtitle="Collections, GST, company share and vendor payouts for the selected range."
        from={from}
        to={to}
        vendorId={vendorId}
        onFrom={setFrom}
        onTo={setTo}
        onVendor={setVendorId}
        onRefresh={load}
        vendors={vendors}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Collected (cash in)"
          value={loading ? "…" : moneyInr(money?.collected)}
          hint={`${numIn(money?.collectionCount)} payments`}
          tone="emerald"
          icon={Wallet}
        />
        <StatTile
          label="Company take"
          value={loading ? "…" : moneyInr(money?.companyTake)}
          hint="Share + GST"
          tone="blue"
          icon={Landmark}
        />
        <StatTile
          label="Vendor payout"
          value={loading ? "…" : moneyInr(money?.vendorPayout)}
          hint={`${numIn(money?.acceptedOffers)} accepted offers`}
          tone="amber"
          icon={Users}
        />
        <StatTile
          label="GST billed"
          value={loading ? "…" : moneyInr(money?.gstBilled)}
          hint={`${numIn(money?.billedTrips)} billed trips`}
          tone="teal"
          icon={Receipt}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total billed"
          value={loading ? "…" : moneyInr(money?.totalBilled)}
          hint="Client grand total"
          tone="slate"
          icon={IndianRupee}
        />
        <StatTile
          label="Pending collection"
          value={loading ? "…" : moneyInr(money?.pendingCollection)}
          hint={`Advance ${moneyInr(money?.advanceRecorded)}`}
          tone="rose"
          icon={ArrowRightLeft}
        />
        <StatTile
          label="Quotations sent"
          value={loading ? "…" : numIn(funnel?.quotationsSent)}
          hint={`Value ${moneyInr(summary?.quotations?.sentValue)}`}
          tone="blue"
          icon={FileText}
        />
        <StatTile
          label="Confirmed / Completed"
          value={loading ? "…" : `${numIn(funnel?.confirmed)} / ${numIn(funnel?.completed)}`}
          hint={`Created ${numIn(funnel?.leadsCreated)} · Lost ${numIn(funnel?.lost)}`}
          tone="emerald"
          icon={BadgeCheck}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-900">Money split</h2>
          </div>
          <div className="space-y-3">
            <MiniBar
              label="Collected"
              value={Number(money?.collected || 0)}
              total={Math.max(collectedTotal, Number(money?.totalBilled || 0), 1)}
              color="bg-emerald-500"
            />
            <MiniBar
              label="Company share"
              value={Number(money?.companyShare || 0)}
              total={Math.max(Number(money?.tripAmountBilled || 0), 1)}
              color="bg-blue-600"
            />
            <MiniBar
              label="Vendor payout"
              value={Number(money?.vendorPayout || 0)}
              total={Math.max(Number(money?.tripAmountBilled || 0), 1)}
              color="bg-amber-500"
            />
            <MiniBar
              label="GST billed"
              value={Number(money?.gstBilled || 0)}
              total={Math.max(Number(money?.totalBilled || 0), 1)}
              color="bg-teal-500"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Payment mix</h2>
          <div className="space-y-3">
            {["RAZORPAY", "CASH", "QR"].map((m) => (
              <MiniBar
                key={m}
                label={m}
                value={Number(money?.byMethod?.[m]?.amount || 0)}
                total={Math.max(collectedTotal, 1)}
                color={m === "RAZORPAY" ? "bg-primary-light0" : m === "CASH" ? "bg-emerald-500" : "bg-sky-500"}
              />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            {["ADVANCE", "FINAL"].map((p) => (
              <div key={p} className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase text-slate-500">{p}</p>
                <p className="text-sm font-bold text-slate-900">
                  {moneyInr(money?.byPurpose?.[p]?.amount)}
                </p>
                <p className="text-[11px] text-muted">{numIn(money?.byPurpose?.[p]?.count)} txns</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Lead funnel (created in range)</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Object.entries(funnel?.byStatus || {}).map(([key, count]) => (
              <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {leadStatusLabel(key)}
                </p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-slate-900">{numIn(count)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
