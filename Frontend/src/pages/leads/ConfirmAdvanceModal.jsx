import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { leadService } from "../../services/leadService";
import { moneyInr } from "../../services/quotationService";
import { openRazorpayCheckout } from "../../utils/razorpayCheckout";

const METHODS = [
  { value: "", label: "No advance" },
  { value: "CASH", label: "Cash" },
  { value: "QR", label: "QR / UPI" },
  { value: "RAZORPAY", label: "Razorpay" },
];

const PROOF_TYPES = [
  { value: "AADHAAR", label: "Aadhaar" },
  { value: "PAN", label: "PAN" },
  { value: "DL", label: "Driving Licence" },
  { value: "VOTER", label: "Voter ID" },
  { value: "PASSPORT", label: "Passport" },
  { value: "OTHER", label: "Other govt ID" },
];

const paymentStatusFromPreview = (grandTotal, advance) => {
  if (!advance || advance <= 0) return { key: "PENDING", label: "Pending" };
  if (grandTotal > 0 && advance + 0.009 >= grandTotal) {
    return { key: "PAID", label: "Paid" };
  }
  return { key: "PARTIALLY_PAID", label: "Partially paid" };
};

export function ConfirmAdvanceModal({ lead, quotations = [], open, onClose, onConfirmed }) {
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const [pickupMode, setPickupMode] = useState("same"); // same | new
  const [dropMode, setDropMode] = useState("same");
  const [exactPickup, setExactPickup] = useState("");
  const [exactDrop, setExactDrop] = useState("");
  const [proofType, setProofType] = useState("AADHAAR");
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => {
    if (!open || !lead) return;
    setMethod("");
    setAmount("");
    setReference("");
    setPickupMode("same");
    setDropMode("same");
    setExactPickup(lead.pickupLocation || "");
    setExactDrop(lead.dropLocation || "");
    setProofType("AADHAAR");
    setProofFile(null);
  }, [open, lead]);

  const quoteTotals = useMemo(() => {
    const fromLead = Number(lead?.grandTotal || 0);
    if (fromLead > 0) {
      return {
        tripAmount: Number(lead.tripAmount || 0),
        gstAmount: Number(lead.gstAmount || 0),
        gstPercent: Number(lead.gstPercent || 0),
        grandTotal: fromLead,
        source: "lead",
      };
    }
    const q =
      quotations.find((x) => x.status === "SENT") ||
      [...quotations].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      )[0] ||
      null;
    if (!q) {
      return { tripAmount: 0, gstAmount: 0, gstPercent: 0, grandTotal: 0, source: null };
    }
    return {
      tripAmount: Number(q.tripAmount || 0),
      gstAmount: Number(q.gstAmount || 0),
      gstPercent: Number(q.gstPercent || 0),
      grandTotal: Number(q.grandTotal || 0),
      source: q.quotationId || "quotation",
    };
  }, [lead, quotations]);

  const grandTotal = quoteTotals.grandTotal;
  const advancePreview = method ? Number(amount || 0) : 0;
  const pendingPreview = useMemo(() => {
    return Math.max(0, Math.round((grandTotal - advancePreview) * 100) / 100);
  }, [grandTotal, advancePreview]);
  const payStatus = paymentStatusFromPreview(grandTotal, advancePreview);

  if (!open || !lead) return null;

  const resolvedPickup =
    pickupMode === "same" ? lead.pickupLocation || "" : exactPickup.trim();
  const resolvedDrop = dropMode === "same" ? lead.dropLocation || "" : exactDrop.trim();

  const submit = async () => {
    if (!resolvedPickup) {
      toast.error("Exact pickup location required");
      return;
    }
    if (!resolvedDrop) {
      toast.error("Exact drop location required");
      return;
    }
    if (!proofFile) {
      toast.error("Upload government ID / address proof (required)");
      return;
    }

    try {
      setSaving(true);
      const form = new FormData();
      form.append("exactPickupLocation", resolvedPickup);
      form.append("exactDropLocation", resolvedDrop);
      form.append("addressProofType", proofType);
      form.append("addressProof", proofFile);

      if (method) {
        const adv = Number(amount);
        if (!Number.isFinite(adv) || adv <= 0) {
          toast.error("Enter advance amount greater than 0");
          return;
        }
        if (adv > grandTotal) {
          toast.error("Advance cannot exceed grand total");
          return;
        }
        form.append("advanceMethod", method);
        form.append("advanceAmount", String(adv));
        if (reference.trim()) form.append("advanceReference", reference.trim());
      }

      const res = await leadService.confirm(lead._id, form);
      const data = res.data.data;

      if (data?.paymentRequired && data?.razorpay) {
        const payment = await openRazorpayCheckout({
          keyId: data.razorpay.keyId,
          orderId: data.razorpay.orderId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          description: `Advance for ${lead.leadId}`,
          prefill: data.customer || {},
          notes: { leadId: lead.leadId, purpose: "ADVANCE" },
        });

        await leadService.verifyAdvance(lead._id, {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
          advanceAmount: Number(amount),
        });
        toast.success("Advance paid — lead confirmed");
      } else {
        toast.success(res.data.message || "Lead confirmed");
      }

      onConfirmed?.();
      onClose?.();
    } catch (error) {
      if (error?.message === "Payment cancelled") {
        toast.error("Razorpay cancelled — lead not confirmed");
      } else {
        toast.error(error.response?.data?.message || error.message || "Confirm failed");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open || !lead) return null;

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Confirm lead"
      description={`${lead.leadId} · exact locations + ID proof required`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || grandTotal <= 0}>
            {saving ? "Please wait..." : "Confirm"}
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            {grandTotal > 0 ? (
              <>
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Trip</span>
                  <span>{moneyInr(quoteTotals.tripAmount)}</span>
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-muted">
                  <span>GST ({quoteTotals.gstPercent || 0}%)</span>
                  <span>{moneyInr(quoteTotals.gstAmount)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-600">Grand total</span>
                  <span className="font-semibold text-slate-900">{moneyInr(grandTotal)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Pending after advance</span>
                  <span className="font-semibold text-slate-900">{moneyInr(pendingPreview)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Payment status</span>
                  <span
                    className={
                      payStatus.key === "PAID"
                        ? "font-semibold text-emerald-700"
                        : payStatus.key === "PARTIALLY_PAID"
                          ? "font-semibold text-amber-700"
                          : "font-semibold text-slate-700"
                    }
                  >
                    {payStatus.label}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-amber-700">
                Grand total missing — create &amp; send a quotation first, then confirm.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exact pickup
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setPickupMode("same");
                  setExactPickup(lead.pickupLocation || "");
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  pickupMode === "same"
                    ? "border-teal-400 bg-teal-50 text-teal-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Same as lead
              </button>
              <button
                type="button"
                onClick={() => setPickupMode("new")}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  pickupMode === "new"
                    ? "border-teal-400 bg-teal-50 text-teal-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Enter new
              </button>
            </div>
            {pickupMode === "same" ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {lead.pickupLocation || "—"}
              </p>
            ) : (
              <Input
                value={exactPickup}
                onChange={(e) => setExactPickup(e.target.value)}
                placeholder="Exact pickup address"
              />
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exact drop
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDropMode("same");
                  setExactDrop(lead.dropLocation || "");
                }}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  dropMode === "same"
                    ? "border-teal-400 bg-teal-50 text-teal-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Same as lead
              </button>
              <button
                type="button"
                onClick={() => setDropMode("new")}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  dropMode === "new"
                    ? "border-teal-400 bg-teal-50 text-teal-900"
                    : "border-slate-200 text-slate-600"
                }`}
              >
                Enter new
              </button>
            </div>
            {dropMode === "same" ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {lead.dropLocation || "—"}
              </p>
            ) : (
              <Input
                value={exactDrop}
                onChange={(e) => setExactDrop(e.target.value)}
                placeholder="Exact drop address"
              />
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
              Address proof (must)
            </p>
            <label className="mb-1 block text-xs font-medium text-slate-600">ID type</label>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={proofType}
              onChange={(e) => setProofType(e.target.value)}
            >
              {PROOF_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="mb-1 mt-2 block text-xs font-medium text-slate-600">
              Upload document (JPG / PNG / PDF)
            </label>
            <Input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/*,application/pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
            {proofFile ? (
              <p className="text-xs text-emerald-700">{proofFile.name}</p>
            ) : (
              <p className="text-xs text-amber-800">Confirmation is not allowed without this document.</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Advance method</label>
            <select
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {METHODS.map((m) => (
                <option key={m.value || "none"} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {method ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Advance amount (₹)
                </label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              {method !== "RAZORPAY" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Reference / note (optional)
                  </label>
                  <Input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Receipt no. / UPI ref"
                  />
                </div>
              ) : (
                <p className="text-xs text-teal-700">
                  Razorpay checkout will open after you continue.
                </p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-muted">
              No advance → payment status Pending. Full amount later via Razorpay at drop.
            </p>
          )}
      </div>
    </Modal>
  );
}
