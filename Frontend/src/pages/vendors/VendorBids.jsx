import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gavel, Timer } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { moneyInr } from "../../services/vendorOfferService";
import { bidService, formatCountdown } from "../../services/bidService";
import { getSocket } from "../../utils/socket";

const FILTERS = [
  { value: "OPEN", label: "Open" },
  { value: "BIDDED", label: "My bids" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ALL", label: "All" },
];

const bucketStyle = {
  OPEN: "bg-amber-100 text-amber-900",
  WON: "bg-emerald-100 text-emerald-800",
  LOST: "bg-slate-100 text-slate-700",
  EXPIRED: "bg-red-50 text-red-800",
  CLOSED: "bg-slate-100 text-slate-600",
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function VendorBids() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = (searchParams.get("status") || "OPEN").toUpperCase();
  const filter = FILTERS.some((f) => f.value === statusParam) ? statusParam : "OPEN";

  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");
  const [bidInputs, setBidInputs] = useState({});
  const [, setTick] = useState(0);

  const setFilter = (next) => {
    setSearchParams(next === "OPEN" ? {} : { status: next });
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await bidService.vendorOpenBids({ status: filter });
      setRows(res.data.data || []);
      setCounts(res.data.counts || {});
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load bids");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (filter !== "OPEN" && filter !== "ALL") return undefined;
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [filter, load]);

  useEffect(() => {
    const s = getSocket();
    if (!s) return undefined;

    const refresh = () => load();
    s.on("bid:opened", refresh);
    s.on("bid:won", refresh);
    s.on("bid:lost", refresh);
    s.on("bid:expired", refresh);

    return () => {
      s.off("bid:opened", refresh);
      s.off("bid:won", refresh);
      s.off("bid:lost", refresh);
      s.off("bid:expired", refresh);
    };
  }, [load]);

  const placeBid = async (round) => {
    const raw = bidInputs[round._id] ?? round.myBid?.amount ?? "";
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 1) {
      toast.error("Enter your bid amount");
      return;
    }
    if (amount > Number(round.maxBidAmount)) {
      toast.error(`Cannot exceed ${moneyInr(round.maxBidAmount)}`);
      return;
    }
    try {
      setActing(round._id);
      const res = await bidService.placeBid(round._id, { amount });
      toast.success(res.data.message || "Bid placed");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Bid failed");
    } finally {
      setActing("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
            <Gavel className="h-5 w-5" />
          </div>
          <div>
            <h1 className="ui-page-title">Live bids</h1>
            <p className="text-sm text-slate-500">Bid ≤ max · 15 min · filter from dropdown</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard/vendor-offers"
            className="text-sm font-medium text-primary hover:underline"
          >
            Fixed offers →
          </Link>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select
              className="h-10 min-w-[11rem] rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                  {counts[f.value] != null ? ` (${counts[f.value]})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="ui-table-wrap">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading bids…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No bids in this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ui-table text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3">Travel</th>
                  <th className="px-4 py-3">Max bid</th>
                  <th className="px-4 py-3">Your bid</th>
                  <th className="px-4 py-3">Time left</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Place / update</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((round) => {
                  const left = Math.max(0, new Date(round.expiresAt).getTime() - Date.now());
                  const open = round.bucket === "OPEN" && left > 0;
                  const myAmt = bidInputs[round._id];

                  return (
                    <tr key={round._id} className={cn(open && "bg-amber-50/30")}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                        {round.roundId}
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
                      <td className="whitespace-nowrap px-4 py-3">
                        {round.myBid?.amount ? (
                          <span className="font-semibold text-emerald-700">
                            {moneyInr(round.myBid.amount)}
                            <span className="ml-1 text-[10px] uppercase text-slate-400">
                              {round.myBid.status}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
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
                            bucketStyle[round.bucket] || bucketStyle.CLOSED
                          )}
                        >
                          {round.bucket}
                        </span>
                        {round.bucket === "WON" ? (
                          <p className="mt-1 text-xs">
                            <Link
                              to="/dashboard/vendor-offers"
                              className="font-medium text-primary hover:underline"
                            >
                              Assign driver
                            </Link>
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {open ? (
                          <div className="flex min-w-[14rem] items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              max={round.maxBidAmount}
                              step="0.01"
                              className="h-9"
                              placeholder={`Max ${round.maxBidAmount}`}
                              value={myAmt ?? ""}
                              onChange={(e) =>
                                setBidInputs((prev) => ({
                                  ...prev,
                                  [round._id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              disabled={acting === round._id}
                              onClick={() => placeBid(round)}
                            >
                              {acting === round._id
                                ? "…"
                                : round.myBid
                                  ? "Update"
                                  : "Bid"}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
