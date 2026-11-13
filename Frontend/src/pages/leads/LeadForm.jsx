import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  leadService,
  LEAD_SOURCES,
  LEAD_STATUSES,
  leadStatusLabel,
  parsePickupTime,
  formatPickupTime,
} from "../../services/leadService";
import { tripTypeService } from "../../services/tripTypeService";
import { carTypeService } from "../../services/carTypeService";

const MATCH_LABELS = {
  mobile: "mobile",
  email: "email",
  route: "pickup → drop",
  route_date: "same route + travel date",
};

const emptyForm = {
  customerName: "",
  mobileNumber: "",
  email: "",
  leadSource: "CALLS",
  pickupLocation: "",
  dropLocation: "",
  travelDate: "",
  endDate: "",
  pickupHour: "",
  pickupMinute: "00",
  pickupPeriod: "AM",
  tripType: "",
  cabType: "",
  customerRequirements: "",
  remarks: "",
  status: "PENDING",
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function Field({ label, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="ui-label">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
        {!required && hint ? <span className="ml-1 font-normal text-slate-400">(optional)</span> : null}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "ui-select";

const textareaClass =
  "ui-textarea";

export function LeadForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const fromMobile = searchParams.get("fromMobile") || "";
  const fromLead = searchParams.get("fromLead") || "";
  const isEdit = Boolean(id);
  const isRepeat = !isEdit && Boolean(fromMobile || fromLead);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [tripTypes, setTripTypes] = useState([]);
  const [cabTypes, setCabTypes] = useState([]);
  const [leadIdLabel, setLeadIdLabel] = useState("");
  const [repeatMeta, setRepeatMeta] = useState(null);
  const [loading, setLoading] = useState(isEdit || isRepeat);
  const [saving, setSaving] = useState(false);
  const [similar, setSimilar] = useState({ hasMatches: false, matches: [], reasons: [] });
  const [checkingSimilar, setCheckingSimilar] = useState(false);
  const similarToastRef = useRef("");

  useEffect(() => {
    tripTypeService
      .dropdown()
      .then((res) => setTripTypes(res.data.data || []))
      .catch(() => toast.error("Failed to load trip types"));
    carTypeService
      .dropdown()
      .then((res) => setCabTypes(res.data.data || []))
      .catch(() => toast.error("Failed to load cab types"));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await leadService.getById(id);
        const l = res.data.data;
        setLeadIdLabel(l.leadId || "");
        setForm({
          ...emptyForm,
          customerName: l.customerName || "",
          mobileNumber: l.mobileNumber || "",
          email: l.email || "",
          leadSource: l.leadSource || "CALLS",
          pickupLocation: l.pickupLocation || "",
          dropLocation: l.dropLocation || "",
          travelDate: l.travelDate ? String(l.travelDate).slice(0, 10) : "",
          endDate: l.endDate ? String(l.endDate).slice(0, 10) : "",
          ...(() => {
            const t = parsePickupTime(l.pickupTime);
            return {
              pickupHour: t.hour,
              pickupMinute: t.minute,
              pickupPeriod: t.period,
            };
          })(),
          tripType: l.tripType?._id || l.tripType || "",
          cabType: l.cabType?._id || l.cabType || "",
          customerRequirements: l.customerRequirements || "",
          remarks: l.remarks || "",
          status: l.status || "PENDING",
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load lead");
        navigate("/dashboard/leads");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, navigate]);

  useEffect(() => {
    if (isEdit || (!fromMobile && !fromLead)) return;
    const loadRepeat = async () => {
      try {
        setLoading(true);
        let p = {};
        let meta = { name: "", trips: 0, completed: 0, sourceLeadId: "" };

        if (fromLead) {
          const res = await leadService.getById(fromLead);
          const l = res.data.data;
          p = {
            customerName: l.customerName || "",
            mobileNumber: l.mobileNumber || "",
            email: l.email || "",
            leadSource: l.leadSource || "CALLS",
            pickupLocation: l.exactPickupLocation || l.pickupLocation || "",
            dropLocation: l.exactDropLocation || l.dropLocation || "",
            pickupTime: l.pickupTime || "",
            tripType: l.tripType?._id || l.tripType || "",
            cabType: l.cabType?._id || l.cabType || "",
            customerRequirements: l.customerRequirements || "",
            remarks: l.remarks || "",
          };
          meta = {
            name: l.customerName || "",
            trips: 0,
            completed: 0,
            sourceLeadId: l.leadId || "",
          };
          const mobileKey = String(l.mobileNumber || "").replace(/\D/g, "").slice(-10);
          if (mobileKey) {
            try {
              const cust = await leadService.repeatCustomer(mobileKey);
              meta.trips = cust.data.data?.summary?.totalTrips || 0;
              meta.completed = cust.data.data?.summary?.completedTrips || 0;
            } catch {
              /* optional stats */
            }
          }
        } else {
          const res = await leadService.repeatCustomer(fromMobile);
          const data = res.data.data;
          p = data.prefill || {};
          meta = {
            name: data.customerName,
            trips: data.summary?.totalTrips || 0,
            completed: data.summary?.completedTrips || 0,
            sourceLeadId: "",
          };
        }

        setRepeatMeta(meta);
        const t = parsePickupTime(p.pickupTime);
        setForm({
          ...emptyForm,
          customerName: p.customerName || "",
          mobileNumber: p.mobileNumber || "",
          email: p.email || "",
          leadSource: p.leadSource || "CALLS",
          pickupLocation: p.pickupLocation || "",
          dropLocation: p.dropLocation || "",
          travelDate: "",
          endDate: "",
          pickupHour: t.hour || "",
          pickupMinute: t.minute || "00",
          pickupPeriod: t.period || "AM",
          tripType: p.tripType ? String(p.tripType) : "",
          cabType: p.cabType ? String(p.cabType) : "",
          customerRequirements: p.customerRequirements || "",
          remarks: p.remarks || "",
          status: "PENDING",
        });
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load customer for new trip");
        navigate(fromLead ? `/dashboard/leads/${fromLead}` : "/dashboard/leads/repeat-customers");
      } finally {
        setLoading(false);
      }
    };
    loadRepeat();
  }, [fromMobile, fromLead, isEdit, navigate]);

  const selectedTripType = tripTypes.find((t) => t._id === form.tripType);
  const isMultiDay = selectedTripType?.durationType === "MULTI_DAY";

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "tripType") {
        const type = tripTypes.find((t) => t._id === value);
        if (type?.durationType !== "MULTI_DAY") next.endDate = "";
      }
      return next;
    });
  };

  useEffect(() => {
    if (isEdit) {
      setSimilar({ hasMatches: false, matches: [], reasons: [] });
      return undefined;
    }

    const mobileDigits = String(form.mobileNumber || "").replace(/\D/g, "");
    const email = String(form.email || "").trim();
    const pickup = String(form.pickupLocation || "").trim();
    const drop = String(form.dropLocation || "").trim();
    const travelDate = form.travelDate || "";

    const enoughMobile = mobileDigits.length >= 8;
    const enoughEmail = email.includes("@");
    const enoughRoute = pickup.length >= 3 && drop.length >= 3;
    if (!enoughMobile && !enoughEmail && !enoughRoute) {
      setSimilar({ hasMatches: false, matches: [], reasons: [] });
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingSimilar(true);
        const res = await leadService.similar({
          mobileNumber: enoughMobile ? mobileDigits.slice(-10) : undefined,
          email: enoughEmail ? email : undefined,
          pickupLocation: enoughRoute ? pickup : undefined,
          dropLocation: enoughRoute ? drop : undefined,
          travelDate: enoughRoute && travelDate ? travelDate : undefined,
        });
        const data = res.data.data || { hasMatches: false, matches: [], reasons: [] };
        setSimilar(data);
        if (data.hasMatches) {
          const fingerprint = (data.matches || [])
            .map((m) => `${m.leadId}:${(m.matchedOn || []).join("+")}`)
            .join("|");
          if (fingerprint && fingerprint !== similarToastRef.current) {
            similarToastRef.current = fingerprint;
            toast(
              `Similar data already found (${(data.reasons || [])
                .map((r) => MATCH_LABELS[r] || r)
                .join(", ")}). You can still create.`,
              { icon: "⚠️", duration: 4500 }
            );
          }
        } else {
          similarToastRef.current = "";
        }
      } catch {
        /* soft check — ignore failures */
      } finally {
        setCheckingSimilar(false);
      }
    }, 550);

    return () => clearTimeout(timer);
  }, [
    isEdit,
    form.mobileNumber,
    form.email,
    form.pickupLocation,
    form.dropLocation,
    form.travelDate,
  ]);

  const validate = () => {
    if (!form.customerName.trim()) return "Customer name is required";
    if (!form.mobileNumber.trim()) return "Mobile number is required";
    if (!form.leadSource) return "Lead source is required";
    if (!form.pickupLocation.trim()) return "Pickup location is required";
    if (!form.dropLocation.trim()) return "Drop location is required";
    if (!form.travelDate) return "Travel date is required";
    if (isMultiDay) {
      if (!form.endDate) return "End date is required for multi-day trips";
      if (form.endDate < form.travelDate) return "End date cannot be before travel date";
    }
    if (!form.pickupHour) return "Pickup time is required";
    if (!form.tripType) return "Trip type is required";
    if (!form.cabType) return "Cab type is required";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const payload = {
      customerName: form.customerName.trim(),
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim() || undefined,
      leadSource: form.leadSource,
      pickupLocation: form.pickupLocation.trim(),
      dropLocation: form.dropLocation.trim(),
      travelDate: form.travelDate,
      endDate: isMultiDay ? form.endDate : null,
      pickupTime: formatPickupTime(form.pickupHour, form.pickupMinute, form.pickupPeriod),
      tripType: form.tripType,
      cabType: form.cabType,
      customerRequirements: form.customerRequirements.trim(),
      remarks: form.remarks.trim(),
    };

    if (isEdit) payload.status = form.status;

    try {
      setSaving(true);
      if (isEdit) {
        await leadService.update(id, payload);
        toast.success("Lead updated");
        navigate(`/dashboard/leads/${id}`);
      } else {
        const res = await leadService.create(payload);
        toast.success(
          isRepeat
            ? `New trip created (${res.data.data?.leadId || ""}) — status Pending`
            : `Lead created (${res.data.data?.leadId || ""}) — status Pending`
        );
        const newId = res.data.data?._id;
        navigate(newId ? `/dashboard/leads/${newId}` : "/dashboard/leads");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading lead...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          to={isRepeat ? "/dashboard/leads/repeat-customers" : "/dashboard/leads"}
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {isRepeat ? "Back to repeat customers" : "Back to leads"}
        </Link>
        <h1 className="ui-page-title">
          {isEdit ? "Edit Lead" : isRepeat ? "New trip (repeat customer)" : "Add Lead"}
        </h1>
        <p className="ui-page-subtitle">
          {isEdit
            ? leadIdLabel
              ? `Updating ${leadIdLabel}`
              : "Update lead details"
            : isRepeat
              ? `Repeat trip for ${repeatMeta?.name || "customer"}${
                  repeatMeta?.sourceLeadId ? ` (from ${repeatMeta.sourceLeadId})` : ""
                }${
                  repeatMeta?.trips
                    ? ` · ${repeatMeta.trips} past trip(s)`
                    : ""
                }. Update details and save — a new lead is created.`
              : "Lead ID is auto-generated. Status will be Pending on create."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-form-card">
        {!isEdit && similar.hasMatches ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  Similar data already found
                  {checkingSimilar ? " · checking…" : ""}
                </p>
                <p className="mt-0.5 text-xs text-amber-800/90">
                  Matched on{" "}
                  {(similar.reasons || [])
                    .map((r) => MATCH_LABELS[r] || r)
                    .join(", ") || "existing leads"}
                  . Create still works — this is only a heads-up.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {(similar.matches || []).slice(0, 5).map((m) => (
                    <li
                      key={m._id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/80 px-2.5 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {m.leadId} · {m.customerName || "—"}
                        </p>
                        <p className="truncate text-[11px] text-muted">
                          {m.mobileNumber}
                          {m.email ? ` · ${m.email}` : ""}
                          {" · "}
                          {leadStatusLabel(m.status)}
                          {m.pickupLocation
                            ? ` · ${m.pickupLocation} → ${m.dropLocation || "—"}`
                            : ""}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-amber-700">
                          {(m.matchedOn || []).map((r) => MATCH_LABELS[r] || r).join(" · ")}
                        </p>
                      </div>
                      <Link
                        to={`/dashboard/leads/${m._id}`}
                        className="shrink-0 text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name" required>
            <Input
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Mobile Number" required>
            <Input
              value={form.mobileNumber}
              onChange={(e) => setField("mobileNumber", e.target.value)}
              placeholder="10-digit mobile"
            />
          </Field>
          <Field label="Email" hint>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="optional@email.com"
            />
          </Field>
          <Field label="Lead Source" required>
            <select
              className={selectClass}
              value={form.leadSource}
              onChange={(e) => setField("leadSource", e.target.value)}
            >
              {LEAD_SOURCES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pickup Location" required className="sm:col-span-2">
            <Input
              value={form.pickupLocation}
              onChange={(e) => setField("pickupLocation", e.target.value)}
              placeholder="Pickup address / area"
            />
          </Field>
          <Field label="Drop Location" required className="sm:col-span-2">
            <Input
              value={form.dropLocation}
              onChange={(e) => setField("dropLocation", e.target.value)}
              placeholder="Drop address / area"
            />
          </Field>
          <Field label="Trip Type" required>
            <select
              className={selectClass}
              value={form.tripType}
              onChange={(e) => setField("tripType", e.target.value)}
            >
              <option value="">Select trip type</option>
              {tripTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                  {t.durationType === "MULTI_DAY" ? " (Multi day)" : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Travel Date" required>
            <Input
              type="date"
              value={form.travelDate}
              onChange={(e) => setField("travelDate", e.target.value)}
            />
          </Field>
          {isMultiDay ? (
            <Field label="End Date" required>
              <Input
                type="date"
                value={form.endDate}
                min={form.travelDate || undefined}
                onChange={(e) => setField("endDate", e.target.value)}
              />
            </Field>
          ) : null}
          <Field label="Pickup Time" required>
            <div className="grid grid-cols-3 gap-2">
              <select
                className={selectClass}
                value={form.pickupHour}
                onChange={(e) => setField("pickupHour", e.target.value)}
              >
                <option value="">Hour</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <select
                className={selectClass}
                value={form.pickupMinute}
                onChange={(e) => setField("pickupMinute", e.target.value)}
              >
                {[
                  ...BASE_MINUTES,
                  ...(form.pickupMinute && !BASE_MINUTES.includes(form.pickupMinute)
                    ? [form.pickupMinute]
                    : []),
                ]
                  .sort((a, b) => Number(a) - Number(b))
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
              </select>
              <select
                className={selectClass}
                value={form.pickupPeriod}
                onChange={(e) => setField("pickupPeriod", e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </Field>
          <Field label="Cab Type Required" required>
            <select
              className={selectClass}
              value={form.cabType}
              onChange={(e) => setField("cabType", e.target.value)}
            >
              <option value="">Select cab type</option>
              {cabTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          {isEdit ? (
            <Field label="Lead Status" required>
              <select
                className={selectClass}
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Lead Status">
              <Input disabled value="Pending (auto on create)" />
            </Field>
          )}
          <Field label="Customer Requirements / Special Instructions" hint className="sm:col-span-2">
            <textarea
              className={textareaClass}
              value={form.customerRequirements}
              onChange={(e) => setField("customerRequirements", e.target.value)}
              placeholder="Any special requests..."
            />
          </Field>
          <Field label="Remarks" hint className="sm:col-span-2">
            <textarea
              className={textareaClass}
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
              placeholder="Internal remarks..."
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to="/dashboard/leads">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={saving}>
            {isEdit ? "Save Changes" : "Create Lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
