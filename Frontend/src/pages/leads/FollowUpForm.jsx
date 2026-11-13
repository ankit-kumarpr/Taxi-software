import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import {
  leadService,
  formatPickupTime,
  parsePickupTime,
} from "../../services/leadService";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const selectClass =
  "ui-select";

export function FollowUpForm() {
  const { id, followUpId } = useParams();
  const isEdit = Boolean(followUpId);
  const navigate = useNavigate();

  const [leadLabel, setLeadLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    followUpDate: "",
    hour: "",
    minute: "00",
    period: "AM",
    reason: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await leadService.getById(id);
        const lead = res.data.data;
        setLeadLabel(`${lead.customerName} (${lead.leadId})`);

        if (isEdit) {
          const item = (lead.followUps || []).find((f) => f._id === followUpId);
          if (!item) {
            toast.error("Follow-up not found");
            navigate(`/dashboard/leads/${id}`);
            return;
          }
          const t = parsePickupTime(item.followUpTime);
          setForm({
            followUpDate: item.followUpDate ? String(item.followUpDate).slice(0, 10) : "",
            hour: t.hour,
            minute: t.minute,
            period: t.period,
            reason: item.reason || "",
          });
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load lead");
        navigate("/dashboard/leads");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, followUpId, isEdit, navigate]);

  const minuteOptions = [
    ...BASE_MINUTES,
    ...(form.minute && !BASE_MINUTES.includes(form.minute) ? [form.minute] : []),
  ].sort((a, b) => Number(a) - Number(b));

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.followUpDate) {
      toast.error("Follow-up date is required");
      return;
    }
    if (!form.hour) {
      toast.error("Follow-up time is required");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Follow-up reason is required");
      return;
    }

    const payload = {
      followUpDate: form.followUpDate,
      followUpTime: formatPickupTime(form.hour, form.minute, form.period),
      reason: form.reason.trim(),
    };

    try {
      setSaving(true);
      if (isEdit) {
        await leadService.updateFollowUp(id, followUpId, payload);
        toast.success("Follow-up updated");
      } else {
        await leadService.addFollowUp(id, payload);
        toast.success("Follow-up added");
      }
      navigate(`/dashboard/leads/${id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link
          to={`/dashboard/leads/${id}`}
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to lead
        </Link>
        <h1 className="ui-page-title">
          {isEdit ? "Edit Follow-up" : "Add Follow-up"}
        </h1>
        <p className="ui-page-subtitle">{leadLabel}</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 ui-form-card"
      >
        <div>
          <label className="ui-label">
            Date <span className="text-danger">*</span>
          </label>
          <Input
            type="date"
            value={form.followUpDate}
            onChange={(e) => setField("followUpDate", e.target.value)}
            disabled={saving}
          />
        </div>

        <div>
          <label className="ui-label">
            Time <span className="text-danger">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <select
              className={selectClass}
              value={form.hour}
              onChange={(e) => setField("hour", e.target.value)}
              disabled={saving}
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
              value={form.minute}
              onChange={(e) => setField("minute", e.target.value)}
              disabled={saving}
            >
              {minuteOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={form.period}
              onChange={(e) => setField("period", e.target.value)}
              disabled={saving}
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <div>
          <label className="ui-label">
            Reason <span className="text-danger">*</span>
          </label>
          <textarea
            className="ui-textarea min-h-[120px]"
            value={form.reason}
            onChange={(e) => setField("reason", e.target.value)}
            placeholder="Why are you following up? Call notes, callback request..."
            disabled={saving}
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to={`/dashboard/leads/${id}`}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={saving}>
            {isEdit ? "Save Changes" : "Add Follow-up"}
          </Button>
        </div>
      </form>
    </div>
  );
}
