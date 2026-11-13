import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { vehicleService } from "../../services/vehicleService";
import { vendorService } from "../../services/vendorService";
import { driverService } from "../../services/driverService";
import { carTypeService } from "../../services/carTypeService";
import { useAuth } from "../../context/AuthContext";
import { flattenRegCheckForDisplay, pickImageUrl } from "../../utils/regCheckDisplay";
import { cn } from "../../utils/cn";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");
const fileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

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

export function VehicleForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [vendor, setVendor] = useState("");
  const [assignedDriver, setAssignedDriver] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  const [vendors, setVendors] = useState([]);
  const [carTypes, setCarTypes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [otherImages, setOtherImages] = useState([]);
  const [existingOtherImages, setExistingOtherImages] = useState([]);
  const [regCheckData, setRegCheckData] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [vehicleIdLabel, setVehicleIdLabel] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const vendorForDrivers = isAdmin ? vendor : user?.id || user?._id;

  useEffect(() => {
    carTypeService
      .dropdown()
      .then((res) => setCarTypes(res.data.data || []))
      .catch(() => toast.error("Failed to load car types"));

    if (!isAdmin) return;
    vendorService
      .list({ status: "ACTIVE", documentVerificationStatus: "VERIFIED", limit: 200, page: 1 })
      .then((res) => setVendors(res.data.data || []))
      .catch(() => toast.error("Failed to load vendors"));
  }, [isAdmin]);

  useEffect(() => {
    if (!vendorForDrivers) {
      setDrivers([]);
      return;
    }
    const params = { status: "ACTIVE", limit: 200, page: 1 };
    if (isAdmin) params.assignedVendor = vendorForDrivers;
    driverService
      .list(params)
      .then((res) => setDrivers(res.data.data || []))
      .catch(() => setDrivers([]));
  }, [vendorForDrivers, isAdmin]);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await vehicleService.getById(id);
        const v = res.data.data;
        setVehicleIdLabel(v.vehicleId || "");
        setVehicleNumber(v.vehicleNumber || "");
        setVehicleType(v.vehicleType?._id || v.vehicleType || "");
        setVendor(v.vendor?._id || v.vendor || "");
        setAssignedDriver(v.assignedDriver?._id || v.assignedDriver || "");
        setStatus(v.status || "ACTIVE");
        setExistingOtherImages(v.otherImages || []);
        setRegCheckData(
          v.regCheckData || v.rcDetails
            ? { raw: v.regCheckData, details: v.rcDetails, flat: v.rcDetails?.flat }
            : null
        );
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load vehicle");
        navigate("/dashboard/vehicles");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, navigate]);

  const handleLookup = async () => {
    const number = vehicleNumber.trim();
    if (!number) {
      toast.error("Enter vehicle number first");
      return;
    }
    try {
      setLookingUp(true);
      const res = await vehicleService.lookupRc(number);
      const payload = res.data.data;
      console.log("[RegCheck CheckIndia] API response:", payload?.raw || payload);
      setRegCheckData(payload);
      setVehicleNumber((payload?.registrationNumber || number).toUpperCase());
      toast.success("RC details loaded");
    } catch (error) {
      console.error("[RegCheck CheckIndia] lookup failed:", error.response?.data || error);
      toast.error(error.response?.data?.message || "RC lookup failed");
    } finally {
      setLookingUp(false);
    }
  };

  const validate = () => {
    if (!vehicleNumber.trim()) return "Vehicle number is required";
    if (!isEdit && !regCheckData) return "Pehle Fetch RC karo";
    if (!vehicleType) return "Vehicle type (hamara) required";
    if (isAdmin && !vendor) return "Vendor is required";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    const fd = new FormData();
    fd.append("vehicleNumber", vehicleNumber.trim());
    fd.append("vehicleType", vehicleType);
    fd.append("status", status);
    fd.append("assignedDriver", assignedDriver || "unassigned");
    if (isAdmin) fd.append("vendor", vendor);
    if (regCheckData) fd.append("regCheckData", JSON.stringify(regCheckData));

    for (const file of otherImages) {
      fd.append("otherImages", file);
    }

    try {
      setSaving(true);
      if (isEdit) {
        await vehicleService.update(id, fd);
        toast.success("Vehicle updated");
      } else {
        const res = await vehicleService.create(fd);
        toast.success(`Vehicle registered (${res.data.data?.vehicleId || ""})`);
      }
      navigate("/dashboard/vehicles");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading vehicle...</div>;
  }

  // Every API key (nested CurrentTextValue unwrapped) — empty also shown as —
  const previewRows = flattenRegCheckForDisplay(regCheckData);
  const imageUrl = pickImageUrl(regCheckData);
  const filledCount = previewRows.filter((r) => !r.isEmpty && !r.isImage).length;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          to="/dashboard/vehicles"
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to vehicles
        </Link>
        <h1 className="ui-page-title">
          {isEdit ? "Edit Vehicle" : "Register Vehicle"}
        </h1>
        <p className="ui-page-subtitle">
          {isEdit && vehicleIdLabel ? `Updating ${vehicleIdLabel}. ` : ""}
          Number se RC fetch — baaki details API se. Sirf hamara vehicle type + images.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-form-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vehicle Number" required className="sm:col-span-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={vehicleNumber}
                onChange={(e) => {
                  setVehicleNumber(e.target.value.toUpperCase());
                  if (!isEdit) setRegCheckData(null);
                }}
                placeholder="e.g. WB24AE4770"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleLookup} disabled={lookingUp}>
                <Search className="mr-2 h-4 w-4" />
                {lookingUp ? "Fetching…" : "Fetch RC"}
              </Button>
            </div>
          </Field>

          <Field label="Vehicle Type (ours)" required>
            <select
              className={selectClass}
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              <option value="">Select our car type</option>
              {carTypes.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          {isAdmin ? (
            <Field label="Vendor" required>
              <select
                className={selectClass}
                value={vendor}
                onChange={(e) => {
                  setVendor(e.target.value);
                  setAssignedDriver("");
                }}
              >
                <option value="">Select vendor</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.companyName} ({v.vendorId})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Vendor">
              <Input disabled value={user?.companyName || user?.name || "Your vendor account"} />
            </Field>
          )}

          <Field label="Assigned Driver" hint>
            <select
              className={selectClass}
              value={assignedDriver}
              onChange={(e) => setAssignedDriver(e.target.value)}
              disabled={isAdmin && !vendor}
            >
              <option value="">Unassigned</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.driverId}) — {d.mobileNumber}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" required>
            <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
        </div>

        {previewRows.length ? (
          <div className="rounded-xl border border-primary/15 bg-primary-light/40 p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">RC details (complete API)</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                {previewRows.length} fields · {filledCount} with data · empty bhi dikhega (—)
              </p>
            </div>

            {imageUrl ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-primary/15 bg-white p-3">
                <img src={imageUrl} alt="RC vehicle" className="mx-auto max-h-40 object-contain" />
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {previewRows
                .filter((row) => !/imageurl$/i.test(row.key))
                .map((row) => (
                  <div
                    key={row.key}
                    className="rounded-lg border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {row.label}
                    </p>
                    <p
                      className={cn(
                        "mt-1 break-words text-sm font-medium",
                        row.isEmpty ? "text-slate-400" : "text-slate-900"
                      )}
                    >
                      {row.value}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.key}</p>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            Number daalo → <strong>Fetch RC</strong> — saari API details yahan dikhengi.
          </div>
        )}

        <div className="space-y-3 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-semibold text-slate-900">Other images</h2>
          <Field label="Upload images" hint>
            <Input
              type="file"
              accept="image/*,.pdf"
              multiple
              onChange={(e) => setOtherImages(Array.from(e.target.files || []))}
            />
            {otherImages.length ? (
              <p className="mt-1 text-[11px] text-muted">{otherImages.length} file(s) selected</p>
            ) : null}
            {existingOtherImages.length ? (
              <ul className="mt-2 space-y-1">
                {existingOtherImages.map((doc) => (
                  <li key={doc._id || doc.url}>
                    <a
                      href={fileUrl(doc.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {doc.originalName || "Image"}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to="/dashboard/vehicles">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={saving}>
            {isEdit ? "Save Changes" : "Register Vehicle"}
          </Button>
        </div>
      </form>
    </div>
  );
}
