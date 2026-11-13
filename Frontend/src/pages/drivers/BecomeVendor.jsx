import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Landmark,
  FileUp,
  KeyRound,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { useAuth } from "../../context/AuthContext";
import { driverService } from "../../services/driverService";

const FILE_FIELDS = [
  { key: "cancelledCheque", label: "Cancelled Cheque / Bank Proof" },
  { key: "aadhaarDocument", label: "Aadhaar Document" },
  { key: "panDocument", label: "PAN Document" },
  { key: "companyRegistrationDocument", label: "Company Registration" },
  { key: "gstCertificate", label: "GST Certificate" },
];

const STEPS = [
  { id: 1, title: "Company", subtitle: "Basic details", icon: Building2 },
  { id: 2, title: "Address", subtitle: "Contact & location", icon: MapPin },
  { id: 3, title: "Bank", subtitle: "Payment info", icon: Landmark },
  { id: 4, title: "Documents", subtitle: "Optional uploads", icon: FileUp },
  { id: 5, title: "Login", subtitle: "Account access", icon: KeyRound },
];

function Field({ label, required, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
        {!required && hint ? <span className="ml-1 font-normal text-slate-400">(optional)</span> : null}
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "ui-select";

function Stepper({ step, steps }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((item, index) => {
        const done = step > item.id;
        const active = step === item.id;
        const Icon = item.icon;
        return (
          <li
            key={item.id}
            className={cn(
              "relative flex items-center gap-3 rounded-xl border px-3 py-3 transition",
              active && "border-primary/35 bg-primary-light shadow-sm",
              done && "border-emerald-200 bg-emerald-50",
              !active && !done && "border-slate-200 bg-white"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                active && "bg-primary text-white",
                done && "bg-emerald-500 text-white",
                !active && !done && "bg-slate-100 text-slate-500"
              )}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <p className={cn("text-sm font-semibold", active ? "text-navy" : "text-slate-800")}>
                {index + 1}. {item.title}
              </p>
              <p className="truncate text-[11px] text-muted">{item.subtitle}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function BecomeVendor() {
  const { id: driverIdParam } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdminPromote = user?.userType === "ADMIN" && Boolean(driverIdParam);
  const backTo = isAdminPromote ? "/dashboard/drivers" : "/dashboard";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorTypes, setVendorTypes] = useState([]);
  const [driverMeta, setDriverMeta] = useState(null);
  const [files, setFiles] = useState({});
  const [otherDocuments, setOtherDocuments] = useState([]);
  const [form, setForm] = useState({
    companyName: "",
    vendorType: "",
    ownerName: "",
    contactPersonName: "",
    mobileNumber: "",
    alternateContactNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    aadhaarNumber: "",
    panNumber: "",
    gstNumber: "",
    companyRegistrationNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
    country: "India",
    bankAccountHolderName: "",
    bankName: "",
    bankAccountNumber: "",
    ifscCode: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactNumber: "",
  });

  const typeName = useMemo(
    () => vendorTypes.find((t) => t._id === form.vendorType)?.name || "-",
    [vendorTypes, form.vendorType]
  );

  const uploadedCount = useMemo(() => {
    const single = FILE_FIELDS.filter(({ key }) => files[key]).length;
    return single + otherDocuments.length;
  }, [files, otherDocuments]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = isAdminPromote
          ? await driverService.promoteVendorPrefill(driverIdParam)
          : await driverService.becomeVendorPrefill();
        const { driver, vendorTypes: types } = res.data.data;
        setDriverMeta(driver);
        setVendorTypes(types || []);
        setForm((prev) => ({
          ...prev,
          companyName: driver.name ? `${driver.name} Travels` : "",
          ownerName: driver.name || "",
          contactPersonName: driver.name || "",
          mobileNumber: driver.mobileNumber || "",
          email: driver.email || "",
          aadhaarNumber: driver.aadhaarNumber || "",
          addressLine1: driver.address || "",
        }));
      } catch (error) {
        toast.error(error.response?.data?.message || "Unable to start upgrade");
        navigate(backTo);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, isAdminPromote, driverIdParam, backTo]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validateStep = (current) => {
    if (current === 1) {
      if (!form.companyName.trim()) return "Company / Vendor name is required";
      if (!form.vendorType) return "Please select a vendor type";
      if (!form.mobileNumber.trim()) return "Mobile number is required";
      if (!form.contactPersonName.trim() && !form.ownerName.trim()) {
        return "Enter contact person or owner name";
      }
    }
    if (current === 2) {
      if (!form.addressLine1.trim()) return "Address line 1 is required";
      if (!form.city.trim()) return "City is required";
      if (!form.state.trim()) return "State is required";
      if (!form.pinCode.trim()) return "PIN code is required";
    }
    if (current === 5) {
      if (!form.email.trim()) return "Email is required";
      if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email";
      if (!form.password || form.password.length < 6) return "Password must be at least 6 characters";
      if (form.password !== form.confirmPassword) return "Passwords do not match";
      if (!vendorTypes.length) return "Create a Vendor Type first";
    }
    return null;
  };

  const goNext = () => {
    const error = validateStep(step);
    if (error) return toast.error(error);
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const error = validateStep(5);
    if (error) return toast.error(error);

    try {
      setSaving(true);
      const fd = new FormData();
      const skip = new Set(["confirmPassword"]);
      Object.entries(form).forEach(([key, value]) => {
        if (skip.has(key)) return;
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          fd.append(key, String(value).trim());
        }
      });
      FILE_FIELDS.forEach(({ key }) => {
        if (files[key]) fd.append(key, files[key]);
      });
      otherDocuments.forEach((file) => fd.append("otherDocuments", file));

      if (isAdminPromote) {
        const res = await driverService.promoteVendor(driverIdParam, fd);
        toast.success(res.data.message || "Driver promoted to vendor");
        const vendorId = res.data.data?.vendor?._id;
        navigate(vendorId ? `/dashboard/vendors/${vendorId}` : "/dashboard/vendors");
      } else {
        const res = await driverService.becomeVendor(fd);
        toast.success(res.data.message || "You are now a vendor. Please login again.");
        logout();
        navigate("/", { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not become vendor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading upgrade form…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {isAdminPromote ? "Back to drivers" : "Back to dashboard"}
        </Link>
        <h1 className="ui-page-title">
          {isAdminPromote ? "Promote Driver to Vendor" : "Become a Vendor"}
        </h1>
        <p className="ui-page-subtitle">
          Driver {driverMeta?.driverId} — same step-by-step form as vendor registration. Driver login
          will become inactive after submit.
        </p>
      </div>

      <Stepper step={step} steps={STEPS} />

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
        {isAdminPromote ? (
          <>
            This will create a <strong>vendor</strong> from this driver and mark the driver{" "}
            <strong>INACTIVE</strong>. They should login next with the vendor email/password.
          </>
        ) : (
          <>
            Submitting will <strong>deactivate your driver account</strong>. Next login with this
            email/password opens the <strong>vendor dashboard</strong>.
          </>
        )}
      </div>

      {!vendorTypes.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          Pehle{" "}
          <Link to="/dashboard/vendor-types" className="font-medium underline">
            Vendor Type
          </Link>{" "}
          banao, phir continue karo.
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length) goNext();
          else handleSubmit(e);
        }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Company details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company / Vendor Name" required>
                <Input value={form.companyName} onChange={(e) => setField("companyName", e.target.value)} />
              </Field>
              <Field label="Vendor Type" required>
                <select
                  className={selectClass}
                  value={form.vendorType}
                  onChange={(e) => setField("vendorType", e.target.value)}
                >
                  <option value="">Select type</option>
                  {vendorTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Contact Person Name">
                <Input
                  value={form.contactPersonName}
                  onChange={(e) => setField("contactPersonName", e.target.value)}
                />
              </Field>
              <Field label="Owner Name">
                <Input value={form.ownerName} onChange={(e) => setField("ownerName", e.target.value)} />
              </Field>
              <Field label="Mobile Number" required>
                <Input
                  value={form.mobileNumber}
                  onChange={(e) => setField("mobileNumber", e.target.value)}
                />
              </Field>
              <Field label="Alternate Number" hint>
                <Input
                  value={form.alternateContactNumber}
                  onChange={(e) => setField("alternateContactNumber", e.target.value)}
                />
              </Field>
              <Field label="GST Number" hint>
                <Input value={form.gstNumber} onChange={(e) => setField("gstNumber", e.target.value)} />
              </Field>
              <Field label="Company Registration No." hint>
                <Input
                  value={form.companyRegistrationNumber}
                  onChange={(e) => setField("companyRegistrationNumber", e.target.value)}
                />
              </Field>
              <Field label="PAN Number" hint>
                <Input value={form.panNumber} onChange={(e) => setField("panNumber", e.target.value)} />
              </Field>
              <Field label="Aadhaar Number" hint>
                <Input
                  value={form.aadhaarNumber}
                  onChange={(e) => setField("aadhaarNumber", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Address</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Address Line 1" required className="sm:col-span-2">
                <Input
                  value={form.addressLine1}
                  onChange={(e) => setField("addressLine1", e.target.value)}
                />
              </Field>
              <Field label="Address Line 2" hint className="sm:col-span-2">
                <Input
                  value={form.addressLine2}
                  onChange={(e) => setField("addressLine2", e.target.value)}
                />
              </Field>
              <Field label="City" required>
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} />
              </Field>
              <Field label="State" required>
                <Input value={form.state} onChange={(e) => setField("state", e.target.value)} />
              </Field>
              <Field label="PIN Code" required>
                <Input value={form.pinCode} onChange={(e) => setField("pinCode", e.target.value)} />
              </Field>
              <Field label="Country" hint>
                <Input value={form.country} onChange={(e) => setField("country", e.target.value)} />
              </Field>
              <Field label="Emergency Contact Name" hint>
                <Input
                  value={form.emergencyContactName}
                  onChange={(e) => setField("emergencyContactName", e.target.value)}
                />
              </Field>
              <Field label="Relationship" hint>
                <Input
                  value={form.emergencyContactRelationship}
                  onChange={(e) => setField("emergencyContactRelationship", e.target.value)}
                />
              </Field>
              <Field label="Emergency Number" hint>
                <Input
                  value={form.emergencyContactNumber}
                  onChange={(e) => setField("emergencyContactNumber", e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Bank details</h2>
            <p className="text-sm text-slate-500">Optional — skip karke aage badh sakte ho.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account Holder Name" hint>
                <Input
                  value={form.bankAccountHolderName}
                  onChange={(e) => setField("bankAccountHolderName", e.target.value)}
                />
              </Field>
              <Field label="Bank Name" hint>
                <Input value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} />
              </Field>
              <Field label="Account Number" hint>
                <Input
                  value={form.bankAccountNumber}
                  onChange={(e) => setField("bankAccountNumber", e.target.value)}
                />
              </Field>
              <Field label="IFSC Code" hint>
                <Input value={form.ifscCode} onChange={(e) => setField("ifscCode", e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
              <p className="text-sm text-slate-500">
                Sab optional hai. JPG / PNG / PDF, max 8MB. Skip bhi kar sakte ho.
              </p>
              {driverMeta?.hasAadhaarDocument ? (
                <p className="mt-2 text-xs text-emerald-700">
                  Existing driver Aadhaar document will be carried over.
                </p>
              ) : null}
              {uploadedCount > 0 && (
                <p className="mt-2 text-sm font-medium text-primary">
                  {uploadedCount} file(s) selected
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {FILE_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label} hint>
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.avif,.pdf"
                    onChange={(e) =>
                      setFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] || null }))
                    }
                  />
                  {files[key] ? (
                    <p className="mt-1 text-xs text-emerald-600">Selected: {files[key].name}</p>
                  ) : null}
                </Field>
              ))}
              <Field label="Other Documents" hint className="sm:col-span-2">
                <Input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.avif,.pdf"
                  onChange={(e) => setOtherDocuments(Array.from(e.target.files || []))}
                />
                {otherDocuments.length > 0 && (
                  <p className="mt-1 text-xs text-emerald-600">
                    {otherDocuments.length} new file(s) selected
                  </p>
                )}
              </Field>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Login account</h2>
              <p className="text-sm text-slate-500">Vendor isi email/password se login karega.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                />
              </Field>
              <Field label="Password" required>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setField("password", e.target.value)}
                  placeholder="Min 6 characters"
                />
              </Field>
              <Field label="Confirm Password" required>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setField("confirmPassword", e.target.value)}
                  placeholder="Re-enter password"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-800">Quick review</h3>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Company</dt>
                  <dd className="font-medium text-slate-900">{form.companyName || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Type</dt>
                  <dd className="font-medium text-slate-900">{typeName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Mobile</dt>
                  <dd className="font-medium text-slate-900">{form.mobileNumber || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">City</dt>
                  <dd className="font-medium text-slate-900">{form.city || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Documents</dt>
                  <dd className="font-medium text-slate-900">
                    {uploadedCount > 0 ? `${uploadedCount} selected` : "None (optional)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Login email</dt>
                  <dd className="font-medium text-slate-900">{form.email || "-"}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => (step === 1 ? navigate(backTo) : goBack())}
            disabled={saving}
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          <div className="flex gap-3">
            {step === 4 && (
              <Button type="button" variant="secondary" onClick={goNext}>
                Skip documents
              </Button>
            )}
            {step < STEPS.length ? (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Saving..."
                  : isAdminPromote
                    ? "Promote to Vendor"
                    : "Become Vendor"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
