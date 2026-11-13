import { useEffect, useState } from "react";
import { MapPin, Play, CheckCircle2, CreditCard, RefreshCw, FileText, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { driverTripService } from "../../services/driverTripService";
import { moneyInr } from "../../services/quotationService";
import { invoicePdfHref } from "../../services/tripService";
import { leadStatusLabel, displayPickupTime } from "../../services/leadService";
import { openRazorpayCheckout } from "../../utils/razorpayCheckout";

const statusColor = (status) => {
  switch (status) {
    case "DRIVER_ASSIGNED":
      return "bg-emerald-100 text-emerald-800";
    case "TRIP_STARTED":
      return "bg-sky-100 text-sky-800";
    case "PAYMENT_PENDING":
      return "bg-orange-100 text-orange-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function DriverTrips() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ completedCount: 0, activeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [acting, setActing] = useState("");
  const [codes, setCodes] = useState({});
  const [completeOtps, setCompleteOtps] = useState({});
  const [otpMeta, setOtpMeta] = useState({});

  const load = async () => {
    try {
      setLoading(true);
      const res = await driverTripService.list(filter ? { status: filter } : {});
      setRows(res.data.data || []);
      setSummary(res.data.summary || { completedCount: 0, activeCount: 0 });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const setCode = (id, value) => {
    setCodes((prev) => ({ ...prev, [id]: value.replace(/\D/g, "").slice(0, 6) }));
  };

  const setCompleteOtp = (id, value) => {
    setCompleteOtps((prev) => ({ ...prev, [id]: value.replace(/\D/g, "").slice(0, 6) }));
  };

  const startTrip = async (trip) => {
    const code = codes[trip._id] || "";
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit pickup code");
      return;
    }
    try {
      setActing(trip._id);
      const res = await driverTripService.start(trip._id, code);
      toast.success(res.data.message || "Trip started");
      setCodes((prev) => ({ ...prev, [trip._id]: "" }));
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not start trip");
    } finally {
      setActing("");
    }
  };

  const runRazorpayCollect = async (trip, payload) => {
    const { razorpay, customer } = payload;
    const payment = await openRazorpayCheckout({
      keyId: razorpay.keyId,
      orderId: razorpay.orderId,
      amount: razorpay.amount,
      currency: razorpay.currency,
      description: `Balance for ${trip.leadId}`,
      prefill: customer || {},
      notes: { leadId: trip.leadId, purpose: "FINAL" },
    });

    await driverTripService.verifyPayment(trip._id, {
      razorpay_order_id: payment.razorpay_order_id,
      razorpay_payment_id: payment.razorpay_payment_id,
      razorpay_signature: payment.razorpay_signature,
    });
  };

  const openInvoice = async (trip) => {
    try {
      setActing(trip._id);
      const res = await driverTripService.invoice(trip._id, { regenerate: 1 });
      const url = res.data.data?.invoicePdfUrl;
      if (!url) {
        toast.error("Invoice not available");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r._id === trip._id
            ? {
                ...r,
                invoiceId: res.data.data.invoiceId,
                invoicePdfUrl: url,
                invoiceGeneratedAt: res.data.data.invoiceGeneratedAt,
              }
            : r
        )
      );
      window.open(invoicePdfHref(url), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open invoice");
    } finally {
      setActing("");
    }
  };

  const sendCompleteOtp = async (trip) => {
    if (!trip.email) {
      toast.error("Customer email missing — cannot send OTP");
      return;
    }
    try {
      setActing(trip._id);
      const res = await driverTripService.sendCompleteOtp(trip._id);
      setOtpMeta((prev) => ({
        ...prev,
        [trip._id]: {
          emailedTo: res.data.data?.emailedTo || "",
          sentAt: res.data.data?.sentAt || new Date().toISOString(),
        },
      }));
      toast.success(res.data.message || "OTP sent to customer email");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setActing("");
    }
  };

  const completeTrip = async (trip) => {
    const otp = completeOtps[trip._id] || "";
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit OTP from customer email");
      return;
    }
    try {
      setActing(trip._id);
      const res = await driverTripService.complete(trip._id, otp);
      const data = res.data.data;
      setCompleteOtps((prev) => ({ ...prev, [trip._id]: "" }));

      if (!data?.paymentRequired) {
        toast.success(res.data.message || "Trip completed");
        load();
        return;
      }

      toast("OTP verified — collect balance via Razorpay", { icon: "💳" });
      await runRazorpayCollect(trip, data);
      toast.success("Payment received — trip completed");
      load();
    } catch (error) {
      if (error?.message === "Payment cancelled") {
        toast.error("Payment cancelled — trip still pending payment");
        load();
      } else {
        toast.error(error.response?.data?.message || error.message || "Complete failed");
      }
    } finally {
      setActing("");
    }
  };

  const resumePayment = async (trip) => {
    try {
      setActing(trip._id);
      const res = await driverTripService.complete(trip._id);
      const data = res.data.data;
      if (!data?.paymentRequired) {
        toast.success(res.data.message || "Trip completed");
        load();
        return;
      }
      await runRazorpayCollect(trip, data);
      toast.success("Payment received — trip completed");
      load();
    } catch (error) {
      if (error?.message === "Payment cancelled") {
        toast.error("Payment cancelled");
      } else {
        toast.error(error.response?.data?.message || error.message || "Payment failed");
      }
      load();
    } finally {
      setActing("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="ui-page-title">My Trips</h1>
          <p className="ui-page-subtitle">
            Pickup code to start · email OTP to complete · Razorpay for balance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">Active + completed</option>
            <option value="DRIVER_ASSIGNED">Ready to start</option>
            <option value="TRIP_STARTED">In progress</option>
            <option value="PAYMENT_PENDING">Payment pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <Button variant="outline" size="icon" onClick={load} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active trips</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.activeCount || 0}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter("COMPLETED")}
          className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-left shadow-sm transition hover:border-emerald-200"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Completed trips</p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">{summary.completedCount || 0}</p>
          <p className="mt-1 text-xs text-emerald-700/80">Tap to filter completed only</p>
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
          Loading trips...
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <MapPin className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">No trips assigned yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {rows.map((trip) => {
            const busy = acting === trip._id;
            const pending = Number(trip.pendingAmount || 0);
            const grand = Number(trip.grandTotal || 0);
            const advance = Number(trip.advancePaid || 0);

            return (
              <li
                key={trip._id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{trip.leadId}</h2>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                          statusColor(trip.status)
                        )}
                      >
                        {leadStatusLabel(trip.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {trip.customerName} · {trip.mobileNumber}
                    </p>
                    <p className="ui-page-subtitle">
                      {trip.pickupLocation} → {trip.dropLocation}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {formatDate(trip.travelDate)} · {displayPickupTime(trip.pickupTime)}
                      {trip.assignedVehicle?.vehicleNumber
                        ? ` · ${trip.assignedVehicle.vehicleNumber}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AmountTile label="Trip total" value={moneyInr(grand)} />
                  <AmountTile label="Advance paid" value={moneyInr(advance)} muted />
                  <AmountTile
                    label="Pending"
                    value={moneyInr(pending)}
                    highlight={pending > 0}
                  />
                  <AmountTile
                    label="GST"
                    value={moneyInr(trip.gstAmount)}
                    muted
                  />
                </div>

                {trip.status === "DRIVER_ASSIGNED" ? (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">
                        Pickup code (from customer)
                      </label>
                      <Input
                        inputMode="numeric"
                        placeholder="6-digit code"
                        value={codes[trip._id] || ""}
                        onChange={(e) => setCode(trip._id, e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <Button disabled={busy} onClick={() => startTrip(trip)}>
                      <Play className="mr-2 h-4 w-4" />
                      Start trip
                    </Button>
                  </div>
                ) : null}

                {trip.status === "TRIP_STARTED" ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-3">
                      <p className="text-xs font-medium text-sky-900">
                        Customer must confirm drop — OTP goes to their email
                        {trip.email ? (
                          <span className="font-normal text-sky-700"> ({trip.email})</span>
                        ) : (
                          <span className="font-normal text-red-600"> — email missing</span>
                        )}
                      </p>
                      {otpMeta[trip._id]?.emailedTo ? (
                        <p className="mt-1 text-xs text-emerald-700">
                          OTP sent to {otpMeta[trip._id].emailedTo}. Ask customer & enter below.
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            Completion OTP (from customer email)
                          </label>
                          <Input
                            inputMode="numeric"
                            placeholder="6-digit OTP"
                            value={completeOtps[trip._id] || ""}
                            onChange={(e) => setCompleteOtp(trip._id, e.target.value)}
                            maxLength={6}
                            autoComplete="one-time-code"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={busy || !trip.email}
                          onClick={() => sendCompleteOtp(trip)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {otpMeta[trip._id] ? "Resend OTP" : "Send OTP"}
                        </Button>
                        <Button disabled={busy} onClick={() => completeTrip(trip)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {pending > 0 ? "Verify & collect" : "Verify & complete"}
                        </Button>
                      </div>
                    </div>
                    {pending <= 0 ? (
                      <span className="text-xs text-emerald-700">
                        Fully paid — completes after OTP match
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted">
                        After OTP, remaining balance via Razorpay only
                      </span>
                    )}
                  </div>
                ) : null}

                {trip.status === "PAYMENT_PENDING" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button disabled={busy} onClick={() => resumePayment(trip)}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay {moneyInr(pending)} via Razorpay
                    </Button>
                    <span className="text-xs text-orange-700">Cash / QR not allowed at drop</span>
                  </div>
                ) : null}

                {trip.status === "COMPLETED" ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-emerald-700">Trip completed</p>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={() => openInvoice(trip)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      {trip.invoiceId ? `Invoice ${trip.invoiceId}` : "View final invoice"}
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

function AmountTile({ label, value, muted, highlight }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        highlight
          ? "border-orange-200 bg-orange-50"
          : muted
            ? "border-slate-100 bg-slate-50"
            : "border-teal-100 bg-teal-50/60"
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm font-semibold",
          highlight ? "text-orange-800" : "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
