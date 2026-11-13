import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { moneyInr } from "../../services/quotationService";
import { tripService } from "../../services/tripService";
import { openRazorpayCheckout } from "../../utils/razorpayCheckout";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "QR", label: "QR / UPI" },
  { value: "RAZORPAY", label: "Razorpay" },
];

export function AdminCompleteTripModal({ lead, open, onClose, onCompleted }) {
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const pending = Number(lead?.pendingAmount || 0);
  const alreadyPaid = pending <= 0 || lead?.paymentStatus === "PAID";

  useEffect(() => {
    if (!open) return;
    setMethod("CASH");
    setReference("");
    setNote("");
  }, [open, lead?._id]);

  const summary = useMemo(
    () => ({
      grandTotal: Number(lead?.grandTotal || 0),
      advancePaid: Number(lead?.advancePaid || 0),
      pending,
    }),
    [lead, pending]
  );

  if (!open || !lead) return null;

  const submit = async () => {
    try {
      setSaving(true);
      const body = alreadyPaid
        ? { note: note.trim() || undefined }
        : {
            method,
            reference: reference.trim() || undefined,
            note: note.trim() || undefined,
          };

      const res = await tripService.adminComplete(lead._id, body);
      const data = res.data.data;

      if (data?.paymentRequired && data?.razorpay) {
        const payment = await openRazorpayCheckout({
          keyId: data.razorpay.keyId,
          orderId: data.razorpay.orderId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          description: `Final payment for ${lead.leadId}`,
          prefill: data.customer || {},
          notes: { leadId: lead.leadId, purpose: "FINAL", by: "ADMIN" },
        });

        await tripService.adminVerifyPayment(lead._id, {
          razorpay_order_id: payment.razorpay_order_id,
          razorpay_payment_id: payment.razorpay_payment_id,
          razorpay_signature: payment.razorpay_signature,
        });
        toast.success("Payment verified — trip completed + invoice sent");
      } else {
        toast.success(res.data.message || "Trip completed");
      }

      onCompleted?.();
      onClose?.();
    } catch (error) {
      if (error?.message === "Payment cancelled") {
        toast.error("Razorpay cancelled — trip still payment pending");
      } else {
        toast.error(error.response?.data?.message || error.message || "Failed to complete trip");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Admin: Complete trip & collect payment"
      description="OTP not required. Invoice + customer email only after full payment."
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            {saving
              ? "Processing…"
              : alreadyPaid
                ? "Mark completed"
                : method === "RAZORPAY"
                  ? "Collect via Razorpay"
                  : "Collect & complete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-[13px]">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Grand total</span>
            <span className="font-semibold">{moneyInr(summary.grandTotal)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="text-slate-500">Already paid</span>
            <span className="font-semibold">{moneyInr(summary.advancePaid)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2 border-t border-slate-200 pt-1">
            <span className="font-medium text-slate-700">Pending</span>
            <span className="font-bold text-navy">{moneyInr(summary.pending)}</span>
          </div>
        </div>

        {alreadyPaid ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
            Pending is zero — trip will be marked completed and invoice emailed (if email exists).
          </p>
        ) : (
          <>
            <div>
              <label className="ui-label">Collect pending via</label>
              <select
                className="ui-select"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                disabled={saving}
              >
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {method !== "RAZORPAY" ? (
              <div>
                <label className="ui-label">Reference (optional)</label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="UPI ref / receipt no."
                  disabled={saving}
                />
              </div>
            ) : (
              <p className="text-[12px] text-slate-500">
                Razorpay checkout open hoga — success pe trip complete + invoice.
              </p>
            )}
          </>
        )}

        <div>
          <label className="ui-label">Admin note (optional)</label>
          <textarea
            className="ui-textarea min-h-[72px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Customer paid at office / driver issue"
            disabled={saving}
          />
        </div>
      </div>
    </Modal>
  );
}
