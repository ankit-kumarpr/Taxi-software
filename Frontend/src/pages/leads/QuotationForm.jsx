import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Mail,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Download,
  Eye,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { quotationService, calcGst, moneyInr } from "../../services/quotationService";
import { canManageQuotations } from "../../services/leadService";

const apiOrigin = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/$/, "");
const pdfHref = (url) => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${apiOrigin}${url.startsWith("/") ? url : `/${url}`}`;
};

function Field({ label, required, children, className = "" }) {
  return (
    <div className={className}>
      <label className="ui-label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function calcTotalDays(start, end) {
  if (!start) return 1;
  const s = new Date(start);
  const e = new Date(end || start);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  return Math.floor(Math.max(0, e - s) / 86400000) + 1;
}

function QuotationPreview({ quotation, companyFallback }) {
  const c = quotation?.company || companyFallback || {};
  const header = pdfHref(c.quotationHeaderImageUrl);
  const logo = pdfHref(c.logoUrl || c.logo?.url);
  const qr = pdfHref(c.paymentQrImageUrl);
  const travel = quotation?.travelDate
    ? new Date(quotation.travelDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";
  const end = quotation?.endDate
    ? new Date(quotation.endDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;
  const travelLabel = end ? `${travel} to ${end}` : travel;
  const totalDays = calcTotalDays(quotation?.travelDate, quotation?.endDate);
  const upis = String(c.upiIds || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const rows = [
    [
      "Client Name",
      `${quotation?.customerName || "—"}${
        quotation?.mobileNumber ? ` · ${quotation.mobileNumber}` : ""
      }`,
    ],
    ["Travelling Date", travelLabel],
    ["Pickup Time", quotation?.pickupTime || "—"],
    ["Pickup Address", quotation?.pickupLocation || "—"],
    ["Drop Address", quotation?.dropLocation || "—"],
    [
      "Travel Schedule",
      quotation?.pickupLocation && quotation?.dropLocation
        ? `${quotation.pickupLocation} to ${quotation.dropLocation}`
        : "—",
    ],
    ["Travel Type", quotation?.tripTypeName || "—"],
    ["Total Days", String(totalDays)],
    ["Vehicle Type", quotation?.cabTypeName || "—"],
    [
      "Base Fare",
      `${moneyInr(quotation?.tripAmount)} | GST (${quotation?.gstPercent ?? 0}%): ${moneyInr(
        quotation?.gstAmount
      )} | Total: ${moneyInr(quotation?.grandTotal)}`,
    ],
  ];
  if (quotation?.notes) rows.push(["Special Note", quotation.notes]);

  const hasBank =
    c.bankName ||
    c.accountNumber ||
    c.ifsc ||
    c.accountHolderName ||
    upis.length ||
    qr;

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#0B3A6E] bg-white shadow-lg">
      <div className="m-2 rounded-xl border border-[#CBD5E1] bg-white p-4 sm:p-5">
        {header ? (
          <img src={header} alt="Header" className="mb-3 max-h-36 w-full object-contain" />
        ) : (
          <div className="mb-3 overflow-hidden rounded-lg border border-slate-200">
            <div className="flex items-center justify-between bg-[#0B3A6E] px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-white">
              <span>Boarding Pass</span>
              <span className="font-normal">Feeling of Royal Ride</span>
            </div>
            <div className="space-y-1 px-3 py-3 text-center">
              {logo ? (
                <img src={logo} alt="Logo" className="mx-auto h-12 w-12 object-contain" />
              ) : null}
              <p className="text-sm font-bold text-[#0B3A6E]">{c.companyName || "Company"}</p>
              <p className="text-[11px] text-muted">
                {[c.addressLine1, c.city, c.state, c.pinCode].filter(Boolean).join(", ")}
              </p>
              {(c.quotationPhone || c.quotationEmail) && (
                <p className="text-[11px] text-slate-600">
                  {[c.quotationPhone && `Booking: ${c.quotationPhone}`, c.quotationEmail]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-y border-dashed border-blue-500 py-2 text-[12px] text-slate-700">
          <span>
            Date & Time:{" "}
            {quotation?.createdAt
              ? new Date(quotation.createdAt).toLocaleString("en-IN")
              : new Date().toLocaleString("en-IN")}
          </span>
          <span className="font-semibold">
            Booking No: {quotation?.quotationId || "Draft"}
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200">
          {rows.map(([label, value], idx) => (
            <div
              key={label}
              className={cn(
                "grid grid-cols-[120px_1fr] gap-2 px-3 py-2 text-[13px]",
                idx % 2 === 0 ? "bg-slate-50" : "bg-white"
              )}
            >
              <span className="font-semibold text-[#0B3A6E]">{label}</span>
              <span className="text-slate-800">{value}</span>
            </div>
          ))}
        </div>

        {hasBank ? (
          <div className="mt-5">
            <h4 className="border-b border-[#0B3A6E] pb-1 text-sm font-bold text-[#0B3A6E]">
              Company Payment Details
            </h4>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200">
                {[
                  ["Bank Name", c.bankName],
                  ["Account Number", c.accountNumber],
                  ["IFSC Code", c.ifsc],
                  ["Account Holder Name", c.accountHolderName],
                ].map(([label, value], idx) => (
                  <div
                    key={label}
                    className={cn(
                      "grid grid-cols-[140px_1fr] gap-2 px-3 py-2 text-[12px]",
                      idx % 2 === 0 ? "bg-slate-50" : "bg-white"
                    )}
                  >
                    <span className="text-slate-500">{label}</span>
                    <span className="font-semibold text-slate-800">{value || "—"}</span>
                  </div>
                ))}
              </div>
              {qr || upis.length ? (
                <div className="mx-auto w-36 shrink-0 text-center">
                  {qr ? (
                    <div className="rounded-lg border border-slate-200 p-2">
                      <img src={qr} alt="Payment QR" className="h-full w-full object-contain" />
                    </div>
                  ) : null}
                  {upis.length ? (
                    <p className="mt-2 text-[11px] font-semibold leading-snug text-slate-700">
                      UPI ID:
                      <br />
                      {upis.map((id) => (
                        <span key={id} className="block font-medium">
                          {id}
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {c.paymentWarningText ? (
          <p className="mt-4 text-center text-[12px] font-semibold text-red-700">
            {c.paymentWarningText}
          </p>
        ) : null}

        {c.termsAndConditions ? (
          <div className="mt-5">
            <h4 className="text-sm font-bold text-[#0B3A6E]">
              Terms & Conditions (For Customer)
            </h4>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[11px] leading-5 text-slate-700">
              {c.termsAndConditions}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function QuotationForm() {
  const { id: leadId, quotationId } = useParams();
  const isEdit = Boolean(quotationId);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [company, setCompany] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [mode, setMode] = useState("edit"); // edit | preview
  const [sendOpen, setSendOpen] = useState(false);
  const [sendChannel, setSendChannel] = useState("WHATSAPP");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [sendEmail, setSendEmail] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [locked, setLocked] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    mobileNumber: "",
    email: "",
    pickupLocation: "",
    dropLocation: "",
    travelDate: "",
    endDate: "",
    pickupTime: "",
    tripTypeName: "",
    cabTypeName: "",
    tripAmount: "",
    gstPercent: "5",
    notes: "Valid for 48 hours from quotation date.",
  });

  const totals = useMemo(
    () => calcGst(form.tripAmount, form.gstPercent),
    [form.tripAmount, form.gstPercent]
  );

  const previewData = useMemo(
    () => ({
      ...(quotation || {}),
      ...form,
      travelDate: form.travelDate || quotation?.travelDate,
      tripAmount: totals.tripAmount,
      gstPercent: totals.gstPercent,
      gstAmount: totals.gstAmount,
      grandTotal: totals.grandTotal,
      company: quotation?.company || company,
    }),
    [quotation, form, totals, company]
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (isEdit) {
          const res = await quotationService.getById(quotationId);
          const q = res.data.data;
          const leadStatus = q.lead?.status;
          const isLocked = !canManageQuotations(leadStatus);
          setLocked(isLocked);
          setQuotation(q);
          setCompany(q.company);
          setIsMultiDay(Boolean(q.endDate));
          setForm({
            customerName: q.customerName || "",
            mobileNumber: q.mobileNumber || "",
            email: q.email || "",
            pickupLocation: q.pickupLocation || "",
            dropLocation: q.dropLocation || "",
            travelDate: q.travelDate ? String(q.travelDate).slice(0, 10) : "",
            endDate: q.endDate ? String(q.endDate).slice(0, 10) : "",
            pickupTime: q.pickupTime || "",
            tripTypeName: q.tripTypeName || "",
            cabTypeName: q.cabTypeName || "",
            tripAmount: String(q.tripAmount ?? ""),
            gstPercent: String(q.gstPercent ?? 5),
            notes: q.notes || "",
          });
          setWhatsappNumber(q.mobileNumber || "");
          setSendEmail(q.email || "");
          setMode("preview");
        } else {
          const res = await quotationService.prefill(leadId);
          const { lead, company: companySnap, defaultGstPercent } = res.data.data;
          setLocked(false);
          setCompany(companySnap);
          setIsMultiDay(lead.tripDurationType === "MULTI_DAY" || Boolean(lead.endDate));
          setForm({
            customerName: lead.customerName || "",
            mobileNumber: lead.mobileNumber || "",
            email: lead.email || "",
            pickupLocation: lead.pickupLocation || "",
            dropLocation: lead.dropLocation || "",
            travelDate: lead.travelDate ? String(lead.travelDate).slice(0, 10) : "",
            endDate: lead.endDate ? String(lead.endDate).slice(0, 10) : "",
            pickupTime: lead.pickupTime || "",
            tripTypeName: lead.tripTypeName || "",
            cabTypeName: lead.cabTypeName || "",
            tripAmount: "",
            gstPercent: String(defaultGstPercent ?? 5),
            notes: "Valid for 48 hours from quotation date.",
          });
          setWhatsappNumber(lead.mobileNumber || "");
          setSendEmail(lead.email || "");
          setMode("edit");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to open quotation");
        navigate(`/dashboard/leads/${leadId}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [leadId, quotationId, isEdit, navigate]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.customerName.trim()) return "Customer name is required";
    if (!form.mobileNumber.trim()) return "Mobile number is required";
    if (!form.pickupLocation.trim() || !form.dropLocation.trim()) return "Pickup and drop are required";
    if (!form.travelDate) return "Travel date is required";
    if (isMultiDay) {
      if (!form.endDate) return "End date is required for multi-day trips";
      if (form.endDate < form.travelDate) return "End date cannot be before travel date";
    }
    if (!form.pickupTime.trim()) return "Pickup time is required";
    if (!Number.isFinite(Number(form.tripAmount)) || Number(form.tripAmount) < 0) {
      return "Enter a valid trip amount";
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      ...form,
      endDate: isMultiDay ? form.endDate || null : null,
      leadId,
      tripAmount: Number(form.tripAmount),
      gstPercent: Number(form.gstPercent),
    };

    try {
      setSaving(true);
      if (isEdit) {
        const res = await quotationService.update(quotationId, payload);
        setQuotation(res.data.data);
        toast.success("Quotation updated");
      } else {
        const res = await quotationService.create(payload);
        toast.success("Quotation created");
        navigate(`/dashboard/leads/${leadId}/quotations/${res.data.data._id}`, { replace: true });
        return;
      }
      setMode("preview");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!quotation?._id) {
      toast.error("Save quotation first");
      return;
    }
    if (sendChannel === "SMS") {
      toast("SMS option ready — API aane pe connect karenge. Abhi WhatsApp / Email use karo.", {
        icon: "💬",
      });
      return;
    }
    try {
      setSending(true);
      const body =
        sendChannel === "WHATSAPP"
          ? { channel: "WHATSAPP", whatsappNumber }
          : { channel: "EMAIL", email: sendEmail };
      const res = await quotationService.send(quotation._id, body);
      setQuotation(res.data.data.quotation);
      toast.success(res.data.message || "Ready to send");

      if (sendChannel === "WHATSAPP") {
        const url = res.data.data.whatsappUrl;
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("Could not build WhatsApp link — check number");
      }
      setSendOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading quotation…</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={`/dashboard/leads/${leadId}`}
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to lead
          </Link>
          <h1 className="ui-page-title">
            {isEdit ? `Quotation ${quotation?.quotationId || ""}` : "Create Quotation"}
          </h1>
          <p className="ui-page-subtitle">
            {locked
              ? "Trip started / completed — quotation is view-only. New trip ke liye Repeat trip use karo."
              : "Trip amount enter karo → GST auto → PDF preview → WhatsApp / Email send."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!locked ? (
            <Button
              type="button"
              variant={mode === "edit" ? "default" : "outline"}
              onClick={() => setMode("edit")}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          ) : null}
          <Button
            type="button"
            variant={mode === "preview" || locked ? "default" : "outline"}
            onClick={() => setMode("preview")}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          {quotation?.pdfUrl ? (
            <a href={pdfHref(quotation.pdfUrl)} target="_blank" rel="noreferrer">
              <Button type="button" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </a>
          ) : null}
          {quotation?._id && !locked ? (
            <Button type="button" onClick={() => setSendOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              Send
            </Button>
          ) : null}
        </div>
      </div>

      {locked ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
          Quotation create / edit disabled after trip start. Use <strong>Repeat trip</strong> for a new
          lead.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {mode === "edit" && !locked ? (
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Quotation details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer name" required>
                <Input
                  value={form.customerName}
                  onChange={(e) => setField("customerName", e.target.value)}
                />
              </Field>
              <Field label="Mobile" required>
                <Input
                  value={form.mobileNumber}
                  onChange={(e) => setField("mobileNumber", e.target.value)}
                />
              </Field>
              <Field label="Email" className="sm:col-span-2">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Field>
              <Field label="Pickup" required className="sm:col-span-2">
                <Input
                  value={form.pickupLocation}
                  onChange={(e) => setField("pickupLocation", e.target.value)}
                />
              </Field>
              <Field label="Drop" required className="sm:col-span-2">
                <Input
                  value={form.dropLocation}
                  onChange={(e) => setField("dropLocation", e.target.value)}
                />
              </Field>
              <Field label="Travel date" required>
                <Input
                  type="date"
                  value={form.travelDate}
                  onChange={(e) => setField("travelDate", e.target.value)}
                />
              </Field>
              {isMultiDay ? (
                <Field label="End date" required>
                  <Input
                    type="date"
                    value={form.endDate}
                    min={form.travelDate || undefined}
                    onChange={(e) => setField("endDate", e.target.value)}
                  />
                </Field>
              ) : null}
              <Field label="Pickup time" required>
                <Input
                  value={form.pickupTime}
                  onChange={(e) => setField("pickupTime", e.target.value)}
                />
              </Field>
              <Field label="Cab type">
                <Input
                  value={form.cabTypeName}
                  onChange={(e) => setField("cabTypeName", e.target.value)}
                />
              </Field>
              <Field label="Trip type">
                <Input
                  value={form.tripTypeName}
                  onChange={(e) => setField("tripTypeName", e.target.value)}
                />
              </Field>
              <Field label="Trip amount (₹)" required>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.tripAmount}
                  onChange={(e) => setField("tripAmount", e.target.value)}
                  placeholder="e.g. 5000"
                />
              </Field>
              <Field label="GST %">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.gstPercent}
                  onChange={(e) => setField("gstPercent", e.target.value)}
                />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <Input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span>Trip Amount</span>
                <strong>{moneyInr(totals.tripAmount)}</strong>
              </div>
              <div className="mt-1 flex justify-between">
                <span>GST ({totals.gstPercent}%)</span>
                <strong>{moneyInr(totals.gstAmount)}</strong>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-semibold">Grand Total</span>
                <strong className="text-primary">{moneyInr(totals.grandTotal)}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMode("preview")}>
                Preview
              </Button>
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update & regenerate PDF" : "Create quotation PDF"}
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
              Live preview. Save karne ke baad PDF download / WhatsApp / Email available.
            </div>
            {!quotation?._id ? (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save to generate PDF"}
              </Button>
            ) : null}
          </section>
        )}

        <QuotationPreview quotation={previewData} companyFallback={company} />
      </div>

      {sendOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Send quotation</h3>
            <p className="ui-page-subtitle">
              Lead status automatically <strong>Quotation Send</strong> ho jayega.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSendChannel("WHATSAPP")}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm",
                  sendChannel === "WHATSAPP"
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200"
                )}
              >
                <MessageCircle className="mb-1 h-4 w-4 text-emerald-600" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setSendChannel("EMAIL")}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm",
                  sendChannel === "EMAIL" ? "border-sky-400 bg-sky-50" : "border-slate-200"
                )}
              >
                <Mail className="mb-1 h-4 w-4 text-sky-600" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setSendChannel("SMS")}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm",
                  sendChannel === "SMS" ? "border-violet-400 bg-violet-50" : "border-slate-200"
                )}
              >
                <MessageSquareText className="mb-1 h-4 w-4 text-violet-600" />
                Text SMS
              </button>
            </div>

            {sendChannel === "WHATSAPP" ? (
              <div className="mt-4">
                <Field label="WhatsApp number" required>
                  <Input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="10-digit mobile"
                  />
                </Field>
              </div>
            ) : null}

            {sendChannel === "EMAIL" ? (
              <div className="mt-4">
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={sendEmail}
                    onChange={(e) => setSendEmail(e.target.value)}
                    placeholder="customer@email.com"
                  />
                </Field>
              </div>
            ) : null}

            {sendChannel === "SMS" ? (
              <div className="mt-4 space-y-3">
                <Field label="Mobile number">
                  <Input
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="10-digit mobile"
                    inputMode="numeric"
                  />
                </Field>
                <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
                  Text SMS option ready. Jab SMS API milegi tab connect karenge — abhi send nahi
                  hoga.
                </div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSendOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSend} disabled={sending}>
                {sending
                  ? "Preparing..."
                  : sendChannel === "SMS"
                    ? "SMS (coming soon)"
                    : "Open & Send"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
