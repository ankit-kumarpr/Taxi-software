import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  User,
  MapPin,
  MessageSquare,
  PhoneCall,
  Trash2,
  CalendarClock,
  FileText,
  Repeat2,
  Ban,
  Receipt,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../utils/cn";
import {
  leadService,
  LEAD_STATUSES,
  leadStatusLabel,
  leadPaymentStatusLabel,
  leadSourceLabel,
  displayPickupTime,
  canCancelLeadStatus,
  canManageQuotations,
} from "../../services/leadService";
import { quotationService, moneyInr } from "../../services/quotationService";
import { invoicePdfHref, tripService } from "../../services/tripService";
import { VendorAssignmentPanel } from "./VendorAssignmentPanel";
import { ConfirmAdvanceModal } from "./ConfirmAdvanceModal";
import { AdminCompleteTripModal } from "./AdminCompleteTripModal";
import { useNotifications } from "../../context/NotificationContext";
import { Can } from "../../components/auth/Can";
import { useAuth } from "../../context/AuthContext";

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-navy break-words whitespace-pre-wrap">
        {value || "—"}
      </dd>
    </div>
  );
}

function Card({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center gap-2">
        {Icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

const statusColor = (status) => {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-800";
    case "NEW":
      return "bg-sky-100 text-sky-800";
    case "FOLLOW_UP":
      return "bg-primary-light text-primary";
    case "QUOTATION_SEND":
      return "bg-violet-100 text-violet-800";
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "VENDOR_OFFERED":
      return "bg-blue-100 text-blue-800";
    case "VENDOR_ACCEPTED":
      return "bg-teal-100 text-teal-800";
    case "DRIVER_ASSIGNED":
      return "bg-emerald-100 text-emerald-800";
    case "TRIP_STARTED":
      return "bg-sky-100 text-sky-800";
    case "PAYMENT_PENDING":
      return "bg-orange-100 text-orange-800";
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "LOST":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-rose-100 text-rose-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
};

const formatFollowDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function LeadView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markReadByLead } = useNotifications();
  const [lead, setLead] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [adminCompleteOpen, setAdminCompleteOpen] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [leadRes, quoteRes] = await Promise.all([
        leadService.getById(id),
        quotationService.listByLead(id).catch(() => ({ data: { data: [] } })),
      ]);
      setLead(leadRes.data.data);
      setQuotations(quoteRes.data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load lead");
      navigate("/dashboard/leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id, navigate]);

  // Opening the lead clears sticky follow-up flash for this lead
  useEffect(() => {
    if (!id) return;
    markReadByLead(id);
  }, [id, markReadByLead]);

  const sortedFollowUps = useMemo(() => {
    const list = [...(lead?.followUps || [])];
    return list.sort((a, b) => {
      const da = new Date(a.followUpDate).getTime();
      const db = new Date(b.followUpDate).getTime();
      if (db !== da) return db - da;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
  }, [lead?.followUps]);

  const nextFollowUp = useMemo(() => {
    if (!sortedFollowUps.length) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = [...sortedFollowUps]
      .filter((f) => new Date(f.followUpDate) >= today)
      .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));
    return upcoming[0] || sortedFollowUps[0];
  }, [sortedFollowUps]);

  const quotationsEditable = canManageQuotations(lead?.status);

  const openInvoice = async () => {
    if (!lead?._id) return;
    try {
      setInvoiceLoading(true);
      const res =
        user?.userType === "ADMIN"
          ? await tripService.adminInvoice(lead._id, { regenerate: 1 })
          : await tripService.vendorInvoice(lead._id, { regenerate: 1 });
      const url = res.data.data?.invoicePdfUrl;
      if (!url) {
        toast.error("Invoice not available");
        return;
      }
      window.open(invoicePdfHref(url), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open invoice");
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (status === "CANCELLED") {
      setCancelOpen(true);
      return;
    }
    if (status === "QUOTATION_SEND") {
      if (!canManageQuotations(lead?.status)) {
        toast.error("Quotation locked after trip started. Use Repeat trip for a new lead.");
        return;
      }
      navigate(`/dashboard/leads/${id}/quotations/create`);
      return;
    }
    if (status === "CONFIRMED") {
      setConfirmOpen(true);
      return;
    }
    try {
      await leadService.changeStatus(id, status);
      toast.success(`Lead marked ${leadStatusLabel(status)}`);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  const submitCancel = async () => {
    const reason = cancelReason.trim();
    if (!reason) {
      toast.error("Cancellation reason is required");
      return;
    }
    try {
      setCancelling(true);
      const res = await leadService.cancel(id, reason);
      toast.success(res.data.message || "Booking cancelled");
      setCancelOpen(false);
      setCancelReason("");
      setLead(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel booking");
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteFollowUp = async (item) => {
    if (!window.confirm("Delete this follow-up?")) return;
    try {
      const res = await leadService.removeFollowUp(id, item._id);
      toast.success("Follow-up deleted");
      setLead(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete follow-up");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading lead...</div>;
  }

  if (!lead) return null;

  const travelDate = lead.travelDate
    ? new Date(lead.travelDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const endDate = lead.endDate
    ? new Date(lead.endDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const createdAt = lead.createdAt
    ? new Date(lead.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard/leads"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to leads
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-page-title">{lead.customerName}</h1>
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-sm font-semibold text-primary">
              {lead.leadId}
            </span>
          </div>
          <p className="ui-page-subtitle">
            {leadSourceLabel(lead.leadSource)} · Created {createdAt}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", statusColor(lead.status))}>
              {leadStatusLabel(lead.status)}
            </span>
            {lead.status !== "CANCELLED" ? (
              <select
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {LEAD_STATUSES.filter((s) => s.value !== "CANCELLED").map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Can permission="leads.create">
            <Link to={`/dashboard/leads/create?fromLead=${lead._id}`}>
              <Button variant="outline">
                <Repeat2 className="mr-2 h-4 w-4" />
                Repeat trip
              </Button>
            </Link>
          </Can>
          {canCancelLeadStatus(lead.status) ? (
            <Can permission="leads.cancel">
              <Button
                type="button"
                variant="outline"
                className="border-rose-200 text-rose-700 hover:bg-rose-50"
                onClick={() => {
                  setCancelReason("");
                  setCancelOpen(true);
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel booking
              </Button>
            </Can>
          ) : null}
          {user?.userType === "ADMIN" &&
          ["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING"].includes(lead.status) ? (
            <Button type="button" onClick={() => setAdminCompleteOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete & collect
            </Button>
          ) : null}
          {lead.status === "COMPLETED" ? (
            Number(lead.pendingAmount) > 0 && lead.paymentStatus !== "PAID" ? (
              <Button type="button" disabled title="Invoice after full payment">
                <Receipt className="mr-2 h-4 w-4" />
                Invoice (payment pending)
              </Button>
            ) : (
              <Button type="button" onClick={openInvoice} disabled={invoiceLoading}>
                <Receipt className="mr-2 h-4 w-4" />
                {invoiceLoading ? "Opening…" : lead.invoiceId || "View Invoice"}
              </Button>
            )
          ) : null}
          {lead.status !== "CANCELLED" ? (
            <>
              {quotationsEditable ? (
                <Link to={`/dashboard/leads/${lead._id}/quotations/create`}>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Create Quotation
                  </Button>
                </Link>
              ) : (
                <Button type="button" disabled title="Locked after trip started">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Quotation
                </Button>
              )}
              <Link to={`/dashboard/leads/${lead._id}/follow-ups/create`}>
                <Button variant="outline" size="icon" title="Add Follow-up">
                  <PhoneCall className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={`/dashboard/leads/${lead._id}/edit`}>
                <Button variant="outline">
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Lead
                </Button>
              </Link>
            </>
          ) : (
            <Link to="/dashboard/leads/cancelled">
              <Button variant="outline">View cancelled list</Button>
            </Link>
          )}
        </div>
      </div>

      {lead.status === "CANCELLED" ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-950">
          <div className="flex items-center gap-2 font-semibold">
            <Ban className="h-4 w-4" />
            Booking cancelled
          </div>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Reason" value={lead.cancellationReason} />
            <Info
              label="Cancelled by"
              value={
                [
                  lead.cancelledByName || lead.cancelledBy?.name,
                  lead.cancelledByDesignation,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"
              }
            />
            <Info
              label="When"
              value={
                lead.cancelledAt
                  ? new Date(lead.cancelledAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"
              }
            />
            <Info
              label="Status before cancel"
              value={lead.statusBeforeCancel ? leadStatusLabel(lead.statusBeforeCancel) : "—"}
            />
          </dl>
        </div>
      ) : null}

      {nextFollowUp ? (
        <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary-light px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Next follow-up</p>
            <p className="text-sm text-primary">
              {formatFollowDate(nextFollowUp.followUpDate)} · {displayPickupTime(nextFollowUp.followUpTime)}
            </p>
            <p className="mt-0.5 text-xs text-primary line-clamp-2">{nextFollowUp.reason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Customer" icon={User}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={lead.customerName} />
            <Info label="Mobile" value={lead.mobileNumber} />
            <Info label="Email" value={lead.email} />
            <Info label="Source" value={leadSourceLabel(lead.leadSource)} />
          </dl>
        </Card>

        <Card title="Trip Details" icon={MapPin}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Pickup (lead)" value={lead.pickupLocation} />
            <Info label="Drop (lead)" value={lead.dropLocation} />
            {lead.exactPickupLocation ? (
              <Info label="Exact pickup" value={lead.exactPickupLocation} />
            ) : null}
            {lead.exactDropLocation ? (
              <Info label="Exact drop" value={lead.exactDropLocation} />
            ) : null}
            <Info label="Travel Date" value={travelDate} />
            {endDate ? <Info label="End Date" value={endDate} /> : null}
            <Info label="Pickup Time" value={displayPickupTime(lead.pickupTime)} />
            <Info
              label="Trip Type"
              value={
                lead.tripType?.name
                  ? `${lead.tripType.name}${
                      lead.tripType.durationType === "MULTI_DAY" ? " (Multi day)" : ""
                    }`
                  : undefined
              }
            />
            <Info label="Cab Type" value={lead.cabType?.name} />
            {lead.addressProofType ? (
              <Info label="Address proof type" value={lead.addressProofType} />
            ) : null}
            {lead.addressProof?.url ? (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Address proof
                </dt>
                <dd className="mt-1">
                  <a
                    href={`${(import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/i, "")}${lead.addressProof.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {lead.addressProof.originalName || "View document"}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {(lead.grandTotal > 0 || lead.payments?.length || lead.paymentStatus) ? (
          <Card title="Payment" icon={FileText} className="lg:col-span-2">
            <dl className="grid gap-4 sm:grid-cols-4">
              <Info label="Grand total" value={moneyInr(lead.grandTotal)} />
              <Info label="Advance paid" value={moneyInr(lead.advancePaid)} />
              <Info label="Pending" value={moneyInr(lead.pendingAmount)} />
              <Info
                label="Payment status"
                value={leadPaymentStatusLabel(lead.paymentStatus || "PENDING")}
              />
              <Info
                label="Pickup code"
                value={
                  ["DRIVER_ASSIGNED", "TRIP_STARTED", "PAYMENT_PENDING", "COMPLETED"].includes(
                    lead.status
                  )
                    ? lead.pickupCode || "—"
                    : "Released after driver+car assign"
                }
              />
            </dl>
            {lead.payments?.length ? (
              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {lead.payments.map((p, idx) => (
                  <li key={p._id || idx} className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="text-slate-600">
                      {p.purpose} · {p.method}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className="font-medium text-slate-900">{moneyInr(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}

        <Card title="Notes" icon={MessageSquare} className="lg:col-span-2">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Customer Requirements" value={lead.customerRequirements} />
            <Info label="Remarks" value={lead.remarks} />
          </dl>
        </Card>
      </div>

      {lead.status !== "CANCELLED" ? (
        <VendorAssignmentPanel lead={lead} quotations={quotations} onChanged={load} />
      ) : null}

      <Card title={`Quotations (${quotations.length})`} icon={FileText}>
        {!quotationsEditable ? (
          <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            Trip started / completed — quotation create &amp; edit locked. New trip ke liye{" "}
            <strong>Repeat trip</strong> use karo (new lead banega).
          </p>
        ) : null}
        {quotations.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">No quotations yet for this lead.</p>
            {quotationsEditable ? (
              <Link to={`/dashboard/leads/${lead._id}/quotations/create`} className="mt-3 inline-block">
                <Button size="sm">Create Quotation</Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2">
            {quotations.map((q) => (
              <li
                key={q._id}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {q.quotationId}{" "}
                    <span
                      className={cn(
                        "ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        q.status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {q.status}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted">
                    {moneyInr(q.grandTotal)} ·{" "}
                    {q.createdAt
                      ? new Date(q.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                <Link to={`/dashboard/leads/${lead._id}/quotations/${q._id}`}>
                  <Button variant="outline" size="sm">
                    {quotationsEditable ? "Open" : "View"}
                  </Button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <ConfirmAdvanceModal
        lead={lead}
        quotations={quotations}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirmed={load}
      />

      <AdminCompleteTripModal
        lead={lead}
        open={adminCompleteOpen}
        onClose={() => setAdminCompleteOpen(false)}
        onCompleted={load}
      />

      <Modal
        open={cancelOpen}
        onClose={() => {
          if (cancelling) return;
          setCancelOpen(false);
          setCancelReason("");
        }}
        title="Cancel booking"
        description="Only allowed before pickup / trip start. Reason and your name are saved."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={cancelling}
              onClick={() => {
                setCancelOpen(false);
                setCancelReason("");
              }}
            >
              Keep booking
            </Button>
            <Button
              type="button"
              disabled={cancelling || !cancelReason.trim()}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={submitCancel}
            >
              <Ban className="mr-2 h-4 w-4" />
              {cancelling ? "Cancelling…" : "Confirm cancel"}
            </Button>
          </>
        }
      >
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Cancellation reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-[110px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="e.g. Customer requested cancel, duplicate booking…"
          disabled={cancelling}
          autoFocus
        />
      </Modal>

      <Card title={`Follow-up History (${sortedFollowUps.length})`} icon={PhoneCall}>
        {sortedFollowUps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              No follow-ups yet. Use the follow-up icon at the top to add one.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sortedFollowUps.map((item, index) => {
              const isNext = nextFollowUp && item._id === nextFollowUp._id;
              return (
                <li
                  key={item._id}
                  className={cn(
                    "rounded-xl border px-4 py-3 transition",
                    isNext ? "border-primary/25 bg-primary-light/60" : "border-slate-200 bg-slate-50/50"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {formatFollowDate(item.followUpDate)} · {displayPickupTime(item.followUpTime)}
                        </span>
                        {isNext ? (
                          <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Next
                          </span>
                        ) : null}
                        {index === 0 ? (
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            Latest
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{item.reason}</p>
                      <p className="mt-2 text-[11px] text-muted">
                        {item.createdBy?.name ? `By ${item.createdBy.name}` : "Logged"}
                        {item.createdAt
                          ? ` · ${new Date(item.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Link to={`/dashboard/leads/${lead._id}/follow-ups/${item._id}/edit`}>
                        <Button variant="ghost" size="icon" title="Edit">
                          <Edit2 className="h-4 w-4 text-slate-500" />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDeleteFollowUp(item)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
