import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, UserCheck, Gavel, Timer, AlertCircle, Car } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { vendorOfferService, moneyInr } from "../../services/vendorOfferService";
import { bidService, formatCountdown, remainingMs } from "../../services/bidService";
import { driverService } from "../../services/driverService";
import { vehicleService } from "../../services/vehicleService";
import { getSocket } from "../../utils/socket";

export function VendorAssignmentPanel({ lead, quotations, onChanged }) {
  const { can } = useAuth();
  const canAssignVendor = can("leads.assign_vendor");
  const canAssignDriver = can("leads.assign_driver");
  const canOpenBid = can("leads.open_bid");
  const canAcceptBid = can("leads.accept_bid") || can("bids.accept");
  const canCancelBid = can("leads.cancel_bid") || can("bids.cancel");

  const [mode, setMode] = useState("FIXED"); // FIXED | BID
  const [offers, setOffers] = useState([]);
  const [fixedVendors, setFixedVendors] = useState([]);
  const [bidVendorsCount, setBidVendorsCount] = useState(0);
  const [vendorId, setVendorId] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [maxBidAmount, setMaxBidAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [bidData, setBidData] = useState({ round: null, bids: [], serverNow: null });
  const [tick, setTick] = useState(0);
  const [fleetDrivers, setFleetDrivers] = useState([]);
  const [fleetVehicles, setFleetVehicles] = useState([]);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [assigningDriver, setAssigningDriver] = useState(false);

  const canAssign =
    canAssignVendor &&
    (lead?.status === "CONFIRMED" ||
      (lead?.status === "VENDOR_OFFERED" &&
        lead?.assignmentMode !== "BID" &&
        !offers.some((o) => o.status === "OFFERED" || o.status === "ACCEPTED") &&
        bidData.round?.status !== "OPEN"));

  const acceptedOffer = useMemo(
    () => offers.find((o) => o.status === "ACCEPTED"),
    [offers]
  );

  const activeOffer = useMemo(
    () => offers.find((o) => o.status === "OFFERED" || o.status === "ACCEPTED"),
    [offers]
  );

  const canManageDriver =
    canAssignDriver &&
    acceptedOffer &&
    (lead?.status === "VENDOR_ACCEPTED" || lead?.status === "DRIVER_ASSIGNED");

  const isReassignDriver =
    Boolean(acceptedOffer?.assignedDriver) && lead?.status === "DRIVER_ASSIGNED";

  const selectedVendor = fixedVendors.find((v) => v._id === vendorId);
  const selectedQuote =
    quotations.find((q) => q._id === quotationId) ||
    quotations.find((q) => q.status === "SENT") ||
    quotations[0];

  const payoutPreview = useMemo(() => {
    if (!selectedVendor || selectedQuote == null) return null;
    const trip = Number(selectedQuote.tripAmount) || 0;
    const pct = Number(selectedVendor.companySharePercent) || 0;
    const company = Math.round(((trip * pct) / 100) * 100) / 100;
    const vendor = Math.round((trip - company) * 100) / 100;
    return { trip, pct, company, vendor };
  }, [selectedVendor, selectedQuote]);

  const loadOffers = useCallback(async () => {
    try {
      const res = await vendorOfferService.listByLead(lead._id);
      setOffers(res.data.data || []);
    } catch {
      setOffers([]);
    }
  }, [lead?._id]);

  const loadBids = useCallback(async () => {
    try {
      const res = await bidService.byLead(lead._id);
      setBidData(res.data.data || { round: null, bids: [], serverNow: null });
    } catch {
      setBidData({ round: null, bids: [], serverNow: null });
    }
  }, [lead?._id]);

  useEffect(() => {
    if (!lead?._id) return;
    loadOffers();
    loadBids();
  }, [lead?._id, loadOffers, loadBids]);

  useEffect(() => {
    if (lead?.assignmentMode === "BID") setMode("BID");
    else if (lead?.assignmentMode === "FIXED") setMode("FIXED");
  }, [lead?.assignmentMode]);

  const loadAssignableVendors = useCallback(() => {
    if (!canAssign) return;
    vendorOfferService
      .listFixedVendors()
      .then((res) => setFixedVendors(res.data.data || []))
      .catch(() => setFixedVendors([]));
    if (canOpenBid) {
      bidService
        .listBidVendors()
        .then((res) => setBidVendorsCount((res.data.data || []).length))
        .catch(() => setBidVendorsCount(0));
    }
  }, [canAssign, canOpenBid]);

  useEffect(() => {
    loadAssignableVendors();
  }, [loadAssignableVendors, mode]);

  const vendorFleetId =
    acceptedOffer?.vendor?._id || acceptedOffer?.vendor || lead?.assignedVendor?._id || "";

  useEffect(() => {
    if (!canManageDriver || !vendorFleetId) {
      setFleetDrivers([]);
      setFleetVehicles([]);
      return;
    }
    Promise.all([
      driverService.list({
        status: "ACTIVE",
        assignedVendor: vendorFleetId,
        documentVerificationStatus: "VERIFIED",
        limit: 100,
      }),
      vehicleService.list({
        status: "ACTIVE",
        vendor: vendorFleetId,
        limit: 100,
      }),
    ])
      .then(([dRes, vRes]) => {
        setFleetDrivers(dRes.data.data || []);
        setFleetVehicles(vRes.data.data || []);
      })
      .catch(() => {
        setFleetDrivers([]);
        setFleetVehicles([]);
      });
  }, [canManageDriver, vendorFleetId, acceptedOffer?._id]);

  useEffect(() => {
    if (!acceptedOffer) {
      setDriverId("");
      setVehicleId("");
      return;
    }
    setDriverId(acceptedOffer.assignedDriver?._id || acceptedOffer.assignedDriver || "");
    setVehicleId(acceptedOffer.assignedVehicle?._id || acceptedOffer.assignedVehicle || "");
  }, [acceptedOffer?._id, acceptedOffer?.assignedDriver, acceptedOffer?.assignedVehicle]);

  useEffect(() => {
    if (quotations?.length) {
      const sent = quotations.find((q) => q.status === "SENT");
      const q = sent || quotations[0];
      setQuotationId(q._id);
      if (!maxBidAmount && q.tripAmount) {
        setMaxBidAmount(String(q.tripAmount));
      }
    }
  }, [quotations]);

  // Countdown tick
  useEffect(() => {
    if (bidData.round?.status !== "OPEN") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [bidData.round?.status]);

  // Realtime socket
  useEffect(() => {
    if (!lead?._id) return;
    const s = getSocket();
    if (!s) return;

    const refresh = () => {
      loadBids();
      loadOffers();
      onChanged?.();
    };

    const onPlaced = (payload) => {
      if (String(payload?.leadId) === String(lead._id)) {
        toast.success(
          `New bid: ${payload?.bid?.vendor?.companyName || "Vendor"} · ${moneyInr(payload?.bid?.amount)}`
        );
        loadBids();
      }
    };
    const onAccepted = (payload) => {
      if (String(payload?.leadId) === String(lead._id)) {
        toast.success("Bid accepted");
        refresh();
      }
    };
    const onExpired = (payload) => {
      if (String(payload?.leadId) === String(lead._id) || payload?.roundId) {
        loadBids();
        onChanged?.();
      }
    };

    s.on("bid:placed", onPlaced);
    s.on("bid:accepted", onAccepted);
    s.on("bid:expired", onExpired);
    s.on("bid:opened", refresh);

    return () => {
      s.off("bid:placed", onPlaced);
      s.off("bid:accepted", onAccepted);
      s.off("bid:expired", onExpired);
      s.off("bid:opened", refresh);
    };
  }, [lead?._id, loadBids, loadOffers, onChanged]);

  // Poll bids while open
  useEffect(() => {
    if (bidData.round?.status !== "OPEN") return;
    const id = setInterval(loadBids, 8000);
    return () => clearInterval(id);
  }, [bidData.round?.status, loadBids]);

  const handleCreateFixedOffer = async () => {
    if (!vendorId) {
      toast.error("Select a fixed vendor");
      return;
    }
    if (!quotationId) {
      toast.error("Need a quotation");
      return;
    }
    try {
      setSaving(true);
      const res = await vendorOfferService.create({
        leadId: lead._id,
        vendorId,
        quotationId,
      });
      toast.success(res.data.message || "Offer sent");
      setVendorId("");
      await loadOffers();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create offer");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBid = async () => {
    const amt = Number(maxBidAmount);
    if (!Number.isFinite(amt) || amt < 1) {
      toast.error("Enter bid amount");
      return;
    }
    if (!quotationId) {
      toast.error("Need a quotation");
      return;
    }
    try {
      setSaving(true);
      const res = await bidService.open({
        leadId: lead._id,
        maxBidAmount: amt,
        quotationId,
      });
      toast.success(res.data.message || "Bid opened");
      await loadBids();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open bid");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptBid = async (bid) => {
    if (!window.confirm(`Accept ${bid.vendor?.companyName} at ${moneyInr(bid.amount)}?`)) return;
    try {
      setSaving(true);
      const res = await bidService.accept(bid._id);
      toast.success(res.data.message || "Bid accepted");
      await Promise.all([loadBids(), loadOffers()]);
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Accept failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelBid = async () => {
    if (!bidData.round?._id) return;
    if (!window.confirm("Cancel this bid round?")) return;
    try {
      await bidService.cancelRound(bidData.round._id);
      toast.success("Bid cancelled");
      await loadBids();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancel failed");
    }
  };

  const handleCancelOffer = async (offer) => {
    if (!canAssignVendor) return;
    if (!window.confirm(`Cancel offer ${offer.offerId}?`)) return;
    try {
      await vendorOfferService.cancel(offer._id);
      toast.success("Offer cancelled");
      await loadOffers();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel");
    }
  };

  const handleAssignDriver = async () => {
    if (!acceptedOffer?._id) return;
    if (!driverId) {
      toast.error("Select a driver");
      return;
    }
    if (!vehicleId) {
      toast.error("Select a car");
      return;
    }
    try {
      setAssigningDriver(true);
      const res = await vendorOfferService.assignDriver(acceptedOffer._id, {
        driverId,
        vehicleId,
      });
      toast.success(res.data.message || "Driver assigned");
      await loadOffers();
      onChanged?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Assign failed");
    } finally {
      setAssigningDriver(false);
    }
  };

  if (!["CONFIRMED", "VENDOR_OFFERED", "VENDOR_ACCEPTED", "DRIVER_ASSIGNED"].includes(lead?.status)) {
    return (
      <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-500">
        <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800">
          <Handshake className="h-4 w-4 text-primary" />
          Vendor assignment
        </div>
        Confirm the lead first, then choose Fixed or Bid.
      </section>
    );
  }

  const openRound = bidData.round?.status === "OPEN" ? bidData.round : null;
  const leftMs = openRound
    ? remainingMs(openRound.expiresAt, bidData.serverNow) - tick * 0
    : 0;
  // recompute with Date.now drift using tick
  const countdownMs = openRound
    ? Math.max(0, new Date(openRound.expiresAt).getTime() - Date.now())
    : 0;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
          <Handshake className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-slate-900">Vendor assignment</h2>
        {lead.assignmentMode ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            {lead.assignmentMode}
          </span>
        ) : null}
      </div>

      {lead.pickupCode ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
          Pickup code: <strong className="tracking-widest">{lead.pickupCode}</strong>
          {lead.assignedDriver ? (
            <span className="mt-1 block">
              Driver: {lead.assignedDriver.name} · {lead.assignedDriver.mobileNumber}
            </span>
          ) : null}
        </div>
      ) : null}

      {canAssign ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-700">How should this lead go?</p>
          <div className={cn("grid gap-2", canOpenBid ? "sm:grid-cols-2" : "")}>
            <button
              type="button"
              onClick={() => setMode("FIXED")}
              className={cn(
                "rounded-xl border px-3 py-3 text-left text-sm transition",
                mode === "FIXED"
                  ? "border-primary bg-primary-light ring-2 ring-primary/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <p className="font-semibold text-slate-900">Fixed</p>
              <p className="mt-0.5 text-[11px] text-muted">
                One FIXED vendor · company % payout
              </p>
            </button>
            {canOpenBid ? (
              <button
                type="button"
                onClick={() => setMode("BID")}
                className={cn(
                  "rounded-xl border px-3 py-3 text-left text-sm transition",
                  mode === "BID"
                    ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <p className="font-semibold text-slate-900">Bid</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  All BID vendors · 15 min · you pick winner
                </p>
              </button>
            ) : null}
          </div>

          {!quotations.length ? (
            <p className="text-sm text-amber-700">Create & send a client quotation first.</p>
          ) : mode === "FIXED" || !canOpenBid ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Quotation</label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={quotationId}
                    onChange={(e) => setQuotationId(e.target.value)}
                  >
                    {quotations.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.quotationId} · trip {moneyInr(q.tripAmount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Fixed vendor</label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={vendorId}
                    onChange={(e) => setVendorId(e.target.value)}
                  >
                    <option value="">Select vendor</option>
                    {fixedVendors.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.companyName} · {v.companySharePercent}%
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {payoutPreview ? (
                <div className="rounded-lg border border-primary/15 bg-white px-3 py-2 text-sm">
                  Vendor payout{" "}
                  <strong className="text-primary">{moneyInr(payoutPreview.vendor)}</strong>
                </div>
              ) : null}
              <Button onClick={handleCreateFixedOffer} disabled={saving || !fixedVendors.length}>
                {saving ? "Sending..." : "Send Fixed offer"}
              </Button>
            </>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Quotation</label>
                  <select
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                    value={quotationId}
                    onChange={(e) => setQuotationId(e.target.value)}
                  >
                    {quotations.map((q) => (
                      <option key={q._id} value={q._id}>
                        {q.quotationId} · trip {moneyInr(q.tripAmount)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Bid amount (max for vendors)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={maxBidAmount}
                    onChange={(e) => setMaxBidAmount(e.target.value)}
                    placeholder="e.g. trip amount"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted">
                Trip details go from the lead. Vendors can bid ≤ this amount. Window = 15 minutes.
                {bidVendorsCount
                  ? ` · ${bidVendorsCount} BID vendor${bidVendorsCount === 1 ? "" : "s"} will be notified.`
                  : null}
              </p>
              {!bidVendorsCount ? (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-medium">Start bid ke liye BID vendor chahiye</p>
                    <p className="mt-0.5 text-xs text-amber-800/90">
                      Koi verified + Active vendor abhi Bid model pe nahi hai. Vendor open karke business
                      model → <strong>Bid</strong> set karo.
                    </p>
                    <Link
                      to="/dashboard/vendors"
                      className="mt-1.5 inline-block text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                    >
                      Go to Vendors →
                    </Link>
                  </div>
                </div>
              ) : null}
              <Button onClick={handleOpenBid} disabled={saving || !bidVendorsCount || !quotationId}>
                <Gavel className="mr-2 h-4 w-4" />
                {saving ? "Starting..." : "Start bid (15 min)"}
              </Button>
            </>
          )}
        </div>
      ) : null}

      {/* Live bid round */}
      {bidData.round ? (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <Gavel className="h-4 w-4" />
              Bid {bidData.round.roundId}{" "}
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase">
                {bidData.round.status}
              </span>
            </div>
            {openRound ? (
              <div className="flex items-center gap-2 text-sm font-bold tabular-nums text-amber-900">
                <Timer className="h-4 w-4" />
                {formatCountdown(countdownMs)} left
              </div>
            ) : null}
          </div>
          <p className="text-sm text-amber-900">
            Max bid {moneyInr(bidData.round.maxBidAmount)} · {bidData.round.pickupLocation} →{" "}
            {bidData.round.dropLocation}
          </p>

          {openRound && canCancelBid ? (
            <Button variant="outline" size="sm" onClick={handleCancelBid}>
              Cancel bid round
            </Button>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
              Bids ({bidData.bids?.length || 0})
            </p>
            {!bidData.bids?.length ? (
              <p className="text-sm text-amber-800/80">Waiting for vendor bids…</p>
            ) : (
              <ul className="space-y-2">
                {[...bidData.bids]
                  .sort((a, b) => a.amount - b.amount)
                  .map((b) => (
                    <li
                      key={b._id}
                      className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm">
                        <p className="font-semibold text-slate-900">
                          {b.vendor?.companyName}{" "}
                          <span className="text-xs font-normal text-slate-500">{b.status}</span>
                        </p>
                        <p className="text-amber-800">
                          Bid <strong>{moneyInr(b.amount)}</strong>
                          {b.placedAt
                            ? ` · ${new Date(b.placedAt).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </p>
                      </div>
                      {openRound && b.status === "ACTIVE" && canAcceptBid ? (
                        <Button size="sm" disabled={saving} onClick={() => handleAcceptBid(b)}>
                          Accept
                        </Button>
                      ) : null}
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {canManageDriver ? (
        <div className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-900">
            <Car className="h-4 w-4" />
            {isReassignDriver ? "Reassign driver & car" : "Assign driver & car"}
          </div>
          <p className="text-xs text-teal-800">
            Fleet of {acceptedOffer.vendor?.companyName || "assigned vendor"}. Customer is emailed
            after assign / reassign (before trip start only).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">Select driver</option>
              {fleetDrivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.driverId})
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Select car</option>
              {fleetVehicles.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber || v.vehicleId}
                </option>
              ))}
            </select>
          </div>
          {!fleetDrivers.length || !fleetVehicles.length ? (
            <p className="text-xs text-amber-800">
              No active drivers/cars on this vendor yet. Add them under Drivers / Vehicles first.
            </p>
          ) : null}
          <Button
            onClick={handleAssignDriver}
            disabled={
              assigningDriver || !driverId || !vehicleId || !fleetDrivers.length || !fleetVehicles.length
            }
          >
            <UserCheck className="mr-2 h-4 w-4" />
            {assigningDriver
              ? "Saving…"
              : isReassignDriver
                ? "Reassign & notify customer"
                : "Assign & notify customer"}
          </Button>
        </div>
      ) : acceptedOffer && !acceptedOffer.assignedDriver ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[13px] text-amber-950">
          <div className="flex items-center gap-2 font-semibold">
            <UserCheck className="h-4 w-4" />
            Waiting for driver assignment
          </div>
          <p className="mt-1">
            Vendor accepted. An admin / staff with <strong>Assign driver</strong> permission will
            assign driver & car.
          </p>
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Offers ({offers.length})
        </p>
        {offers.length === 0 ? (
          <p className="text-sm text-slate-500">No vendor offers yet.</p>
        ) : (
          <ul className="space-y-2">
            {offers.map((o) => (
              <li
                key={o._id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-semibold text-slate-900">
                    {o.offerId}{" "}
                    <span className="ml-1 text-[10px] uppercase text-slate-500">{o.offerType}</span>{" "}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        o.status === "OFFERED" && "bg-blue-100 text-blue-800",
                        o.status === "ACCEPTED" && "bg-teal-100 text-teal-800",
                        o.status === "REJECTED" && "bg-red-100 text-red-800",
                        o.status === "EXPIRED" && "bg-slate-100 text-slate-600",
                        o.status === "CANCELLED" && "bg-amber-100 text-amber-800"
                      )}
                    >
                      {o.status}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted">
                    {o.vendor?.companyName || "Vendor"} · payout {moneyInr(o.vendorPayout)}
                  </p>
                </div>
                {o.status === "OFFERED" && canAssignVendor ? (
                  <Button variant="outline" size="sm" onClick={() => handleCancelOffer(o)}>
                    Cancel
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {activeOffer?.status === "OFFERED" ? (
        <p className="text-[11px] text-muted">
          Waiting for vendor accept
          {activeOffer.expiresAt
            ? ` (expires ${new Date(activeOffer.expiresAt).toLocaleString("en-IN")})`
            : ""}
          .
        </p>
      ) : null}
    </section>
  );
}
