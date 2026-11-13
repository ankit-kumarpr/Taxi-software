import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { driverService } from "../../services/driverService";
import { vendorService } from "../../services/vendorService";
import { useAuth } from "../../context/AuthContext";

const emptyForm = {
  name: "",
  mobileNumber: "",
  email: "",
  password: "",
  confirmPassword: "",
  address: "",
  aadhaarNumber: "",
  drivingLicenceNumber: "",
  dlExpiryDate: "",
  assignedVendor: "",
  status: "ACTIVE",
};

const FILE_FIELDS = [
  { key: "aadhaarDocument", label: "Aadhaar Document", required: true },
  { key: "drivingLicenceDocument", label: "Driving Licence Document", required: true },
  { key: "profilePhoto", label: "Profile Photo", required: false },
];

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

export function DriverForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";

  const [form, setForm] = useState(emptyForm);
  const [vendors, setVendors] = useState([]);
  const [files, setFiles] = useState({});
  const [existingDocs, setExistingDocs] = useState({});
  const [existingOtherDocs, setExistingOtherDocs] = useState([]);
  const [extraDocs, setExtraDocs] = useState([]); // { id, name, file }
  const [driverIdLabel, setDriverIdLabel] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    vendorService
      .list({ status: "ACTIVE", documentVerificationStatus: "VERIFIED", limit: 200, page: 1 })
      .then((res) => setVendors(res.data.data || []))
      .catch(() => toast.error("Failed to load vendors"));
  }, [isAdmin]);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await driverService.getById(id);
        const d = res.data.data;
        setDriverIdLabel(d.driverId || "");
        setForm({
          ...emptyForm,
          name: d.name || "",
          mobileNumber: d.mobileNumber || "",
          email: d.email || "",
          address: d.address || "",
          aadhaarNumber: d.aadhaarNumber || "",
          drivingLicenceNumber: d.drivingLicenceNumber || "",
          dlExpiryDate: d.dlExpiryDate ? String(d.dlExpiryDate).slice(0, 10) : "",
          assignedVendor: d.assignedVendor?._id || d.assignedVendor || "",
          status: d.status || "ACTIVE",
          password: "",
          confirmPassword: "",
        });
        setExistingDocs({
          aadhaarDocument: d.aadhaarDocument,
          drivingLicenceDocument: d.drivingLicenceDocument,
          profilePhoto: d.profilePhoto,
        });
        setExistingOtherDocs(d.otherDocuments || []);
        setExtraDocs([]);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load driver");
        navigate("/dashboard/drivers");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, navigate]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (!form.name.trim()) return "Driver name is required";
    if (!form.mobileNumber.trim()) return "Mobile number is required";
    if (!form.address.trim()) return "Address is required";
    if (!form.aadhaarNumber.trim()) return "Aadhaar number is required";
    if (!form.drivingLicenceNumber.trim()) return "Driving licence number is required";
    if (!form.dlExpiryDate) return "DL expiry date is required";
    if (!isEdit) {
      if (!form.password || form.password.length < 6) return "Password is required (min 6 characters)";
      if (form.password !== form.confirmPassword) return "Passwords do not match";
      if (!files.aadhaarDocument) return "Aadhaar document is required";
      if (!files.drivingLicenceDocument) return "Driving licence document is required";
    } else {
      if (!files.aadhaarDocument && !existingDocs.aadhaarDocument?.url) {
        return "Aadhaar document is required";
      }
      if (!files.drivingLicenceDocument && !existingDocs.drivingLicenceDocument?.url) {
        return "Driving licence document is required";
      }
      if (form.password) {
        if (form.password.length < 6) return "Password must be at least 6 characters";
        if (form.password !== form.confirmPassword) return "Passwords do not match";
      }
    }
    for (const row of extraDocs) {
      if (row.file && !String(row.name || "").trim()) {
        return "Enter a name for each extra document";
      }
      if (String(row.name || "").trim() && !row.file) {
        return "Choose a file for each named extra document";
      }
    }
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
    fd.append("name", form.name.trim());
    fd.append("mobileNumber", form.mobileNumber.trim());
    if (form.email.trim()) fd.append("email", form.email.trim());
    else if (isEdit) fd.append("email", "");
    fd.append("address", form.address.trim());
    fd.append("aadhaarNumber", form.aadhaarNumber.trim());
    fd.append("drivingLicenceNumber", form.drivingLicenceNumber.trim());
    fd.append("dlExpiryDate", form.dlExpiryDate);
    fd.append("status", form.status);
    if (form.password) fd.append("password", form.password);

    if (isAdmin) {
      fd.append("assignedVendor", form.assignedVendor || "unassigned");
    }

    for (const { key } of FILE_FIELDS) {
      if (files[key]) fd.append(key, files[key]);
    }

    for (const row of extraDocs) {
      if (row.file) {
        fd.append("otherDocuments", row.file);
        fd.append("otherDocumentNames", String(row.name || "").trim() || "Document");
      }
    }

    try {
      setSaving(true);
      if (isEdit) {
        await driverService.update(id, fd);
        toast.success("Driver updated");
      } else {
        const res = await driverService.create(fd);
        toast.success(
          `Driver registered (${res.data.data?.driverId || ""}) — pending admin verification`
        );
      }
      navigate("/dashboard/drivers");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save driver");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading driver...</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <Link
          to="/dashboard/drivers"
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to drivers
        </Link>
        <h1 className="ui-page-title">
          {isEdit ? "Edit Driver" : "Register Driver"}
        </h1>
        <p className="ui-page-subtitle">
          {isEdit
            ? driverIdLabel
              ? `Updating ${driverIdLabel}`
              : "Update driver details"
            : isAdmin
              ? "Admin can assign a vendor or leave unassigned. ID starts with TW + 3 letters."
              : "Driver will be tagged to your vendor. ID starts with TW + your company letters."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ui-form-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Driver Name" required>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Full name" />
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
          <Field label="Status" required>
            <select className={selectClass} value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Address" required className="sm:col-span-2">
            <textarea
              className="ui-textarea"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Full address"
            />
          </Field>
          <Field label="Aadhaar Number" required>
            <Input
              value={form.aadhaarNumber}
              onChange={(e) => setField("aadhaarNumber", e.target.value)}
              placeholder="12-digit Aadhaar"
            />
          </Field>
          <Field label="Driving Licence Number" required>
            <Input
              value={form.drivingLicenceNumber}
              onChange={(e) => setField("drivingLicenceNumber", e.target.value)}
              placeholder="DL number"
            />
          </Field>
          <Field label="DL Expiry Date" required>
            <Input
              type="date"
              value={form.dlExpiryDate}
              onChange={(e) => setField("dlExpiryDate", e.target.value)}
            />
          </Field>
          {isAdmin ? (
            <Field label="Assigned Vendor" hint>
              <select
                className={selectClass}
                value={form.assignedVendor}
                onChange={(e) => setField("assignedVendor", e.target.value)}
              >
                <option value="">Unassigned (no vendor)</option>
                {vendors.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.companyName} ({v.vendorId})
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Assigned Vendor">
              <Input
                disabled
                value={user?.companyName || user?.name || "Your vendor account"}
              />
            </Field>
          )}
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-semibold text-slate-900">Documents</h2>
          <p className="text-[11px] text-muted">
            Aadhaar and driving licence are mandatory. Driver cannot login until KYC status is
            Verified by admin.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {FILE_FIELDS.map(({ key, label, required }) => (
              <Field
                key={key}
                label={label}
                required={required && (!isEdit || !existingDocs[key]?.url)}
                hint={!required}
              >
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    setFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] || null }))
                  }
                />
                {existingDocs[key]?.url ? (
                  <a
                    href={fileUrl(existingDocs[key].url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-primary hover:underline"
                  >
                    Current: {existingDocs[key].originalName || "View file"}
                  </a>
                ) : null}
              </Field>
            ))}
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">Additional documents</p>
                <p className="text-[11px] text-muted">Optional — add name + image/PDF</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setExtraDocs((prev) => [
                    ...prev,
                    { id: `${Date.now()}-${Math.random()}`, name: "", file: null },
                  ])
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add document
              </Button>
            </div>

            {existingOtherDocs.length ? (
              <ul className="space-y-1.5">
                {existingOtherDocs.map((doc) => (
                  <li key={doc._id || doc.url} className="text-xs text-slate-600">
                    <a
                      href={fileUrl(doc.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline"
                    >
                      {doc.name || doc.originalName || "Document"}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}

            {extraDocs.map((row) => (
              <div key={row.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  placeholder="Document name"
                  value={row.name}
                  onChange={(e) =>
                    setExtraDocs((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r))
                    )
                  }
                />
                <Input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    setExtraDocs((prev) =>
                      prev.map((r) =>
                        r.id === row.id ? { ...r, file: e.target.files?.[0] || null } : r
                      )
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setExtraDocs((prev) => prev.filter((r) => r.id !== row.id))}
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-100 pt-5">
          <h2 className="text-sm font-semibold text-slate-900">
            {isEdit ? "Change Password" : "Login Password"}
            {!isEdit ? <span className="text-danger"> *</span> : null}
          </h2>
          <p className="text-[11px] text-muted">
            Driver can login with email or mobile number using this password.
            {isEdit ? " Leave blank to keep current password." : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" required={!isEdit}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                placeholder={isEdit ? "Leave blank to keep" : "Min 6 characters"}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm Password" required={!isEdit}>
              <Input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
          <Link to="/dashboard/drivers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={saving}>
            {isEdit ? "Save Changes" : "Register Driver"}
          </Button>
        </div>
      </form>
    </div>
  );
}
