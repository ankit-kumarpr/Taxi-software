import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { cn } from "../../utils/cn";
import { vendorOfferService, moneyInr } from "../../services/vendorOfferService";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function VendorOffers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [acting, setActing] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await vendorOfferService.myOffers(filter ? { status: filter } : {});
      setRows(res.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const accept = async (row) => {
    if (!window.confirm(`Accept offer ${row.offerId}?`)) return;
    try {
      setActing(row._id);
      const res = await vendorOfferService.accept(row._id);
      toast.success(res.data.message || "Accepted — waiting for admin to assign driver");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Accept failed");
    } finally {
      setActing("");
    }
  };

  const reject = async (row) => {
    if (!window.confirm(`Reject offer ${row.offerId}?`)) return;
    try {
      setActing(row._id);
      await vendorOfferService.reject(row._id);
      toast.success("Offer rejected");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Reject failed");
    } finally {
      setActing("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h1 className="ui-page-title">Trip offers</h1>
            <p className="text-sm text-slate-500">
              Accept or reject fixed offers. Driver & car are assigned by admin.
            </p>
          </div>
        </div>
        <Link
          to="/dashboard/vendor-bids"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          Live bids →
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <select
          className="ui-select"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="OFFERED">Offered</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading offers…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
          No offers yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const waitingAdmin =
              row.status === "ACCEPTED" && !row.assignedDriver && !row.clientDetailsReleased;
            return (
              <li key={row._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.offerId}{" "}
                      <span className="text-[10px] uppercase text-slate-400">
                        {row.offerType || "FIXED"}
                      </span>{" "}
                      <span
                        className={cn(
                          "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          row.status === "OFFERED" && "bg-blue-100 text-blue-800",
                          row.status === "ACCEPTED" && "bg-teal-100 text-teal-800",
                          row.status === "REJECTED" && "bg-red-100 text-red-800",
                          row.status === "EXPIRED" && "bg-slate-100 text-slate-600"
                        )}
                      >
                        {row.status}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {row.pickupLocation} → {row.dropLocation}
                    </p>
                    <p className="text-[11px] text-muted">
                      {formatDate(row.travelDate)} · {row.pickupTime} · {row.cabTypeName || "Cab"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted">Your payout</p>
                    <p className="text-lg font-bold text-primary">{moneyInr(row.vendorPayout)}</p>
                  </div>
                </div>

                {row.clientDetailsReleased ? (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
                    <p className="font-semibold">Client details</p>
                    <p>Name: {row.customerName || row.lead?.customerName || "—"}</p>
                    <p>Phone: {row.customerPhone || row.lead?.mobileNumber || "—"}</p>
                    {row.assignedDriver ? (
                      <p className="mt-1">
                        Driver: {row.assignedDriver.name} · {row.assignedDriver.mobileNumber}
                      </p>
                    ) : null}
                    <p className="mt-1 font-bold tracking-widest">Pickup code: {row.pickupCode}</p>
                  </div>
                ) : waitingAdmin ? (
                  <p className="mt-3 text-xs text-amber-700">
                    Waiting for admin to assign driver & car. Client details unlock after that.
                  </p>
                ) : null}

                {row.status === "OFFERED" ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => accept(row)} disabled={acting === row._id}>
                      <Check className="mr-1.5 h-4 w-4" />
                      Accept
                    </Button>
                    <Button variant="outline" onClick={() => reject(row)} disabled={acting === row._id}>
                      <X className="mr-1.5 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
