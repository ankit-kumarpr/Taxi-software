import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Landmark,
  ShieldAlert,
  BadgeCheck,
  BadgeX,
  Handshake,
  Gavel,
  Percent,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { cn } from "../../utils/cn";
import { vendorService } from "../../services/vendorService";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");

const fileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-navy break-words">{value || "-"}</dd>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

function DocLink({ label, doc }) {
  const href = fileUrl(doc?.url);
  if (!href) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-400">
        {label}: not uploaded
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-slate-200 px-3 py-2 text-sm text-primary transition hover:border-primary/35 hover:bg-primary-light"
    >
      {label}
      <span className="mt-0.5 block text-[11px] text-muted">{doc.originalName || "Open file"}</span>
    </a>
  );
}

export function VendorView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dealType, setDealType] = useState("FIXED");
  const [companyPercent, setCompanyPercent] = useState("20");
  const [defaultShare, setDefaultShare] = useState(20);
  const [savingDeal, setSavingDeal] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [vendorRes, shareRes] = await Promise.all([
        vendorService.getById(id),
        vendorService.getFixedShareSettings().catch(() => null),
      ]);
      const data = vendorRes.data.data;
      const def = shareRes?.data?.data?.defaultFixedCompanySharePercent ?? 20;
      setDefaultShare(def);
      setVendor(data);
      setDealType(data.businessModel || "FIXED");
      setCompanyPercent(
        data.companySharePercent != null && data.companySharePercent !== ""
          ? String(data.companySharePercent)
          : String(def)
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load vendor");
      navigate("/dashboard/vendors");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [id, navigate]);

  const handleVerify = async (documentVerificationStatus) => {
    const label = documentVerificationStatus === "VERIFIED" ? "verify" : "reject";
    if (!window.confirm(`Are you sure you want to ${label} this vendor?`)) return;
    try {
      const res = await vendorService.verify(id, documentVerificationStatus);
      toast.success(res.data.message || "Updated");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update verification");
    }
  };

  const handleSaveBusinessModel = async () => {
    if (dealType === "FIXED") {
      const num = Number(companyPercent);
      if (!Number.isFinite(num) || num < 0 || num > 100) {
        toast.error("Company share must be between 0 and 100");
        return;
      }
    }
    try {
      setSavingDeal(true);
      const payload =
        dealType === "FIXED"
          ? { businessModel: "FIXED", companySharePercent: Number(companyPercent) }
          : { businessModel: "BID" };
      const res = await vendorService.setBusinessModel(id, payload);
      toast.success(res.data.message || "Business model saved");
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save business model");
    } finally {
      setSavingDeal(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading vendor...</div>;
  }

  if (!vendor) return null;

  const createdAt = vendor.createdAt
    ? new Date(vendor.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/dashboard/vendors" className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to vendors
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-page-title">{vendor.companyName}</h1>
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-sm font-semibold text-primary">
              {vendor.vendorId}
            </span>
          </div>
          <p className="ui-page-subtitle">
            {vendor.vendorType?.name || "No type"} · Created {createdAt}
            {vendor.createdBy?.name ? ` · by ${vendor.createdBy.name}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                vendor.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {vendor.status}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                vendor.documentVerificationStatus === "VERIFIED" && "bg-green-100 text-green-800",
                vendor.documentVerificationStatus === "REJECTED" && "bg-red-100 text-red-800",
                (!vendor.documentVerificationStatus || vendor.documentVerificationStatus === "PENDING") &&
                  "bg-amber-100 text-amber-800"
              )}
            >
              Docs: {vendor.documentVerificationStatus || "PENDING"}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Rating: {vendor.vendorRating ?? 0}/5
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              Wallet: ₹{Number(vendor.walletBalance || 0).toLocaleString("en-IN")}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                vendor.businessModel === "FIXED" && "bg-primary-light text-primary",
                vendor.businessModel === "BID" && "bg-violet-100 text-violet-800",
                !vendor.businessModel && "bg-amber-100 text-amber-800"
              )}
            >
              {vendor.businessModel === "FIXED"
                ? `Fixed · ${vendor.companySharePercent}% company`
                : vendor.businessModel === "BID"
                  ? "Bid"
                  : "Deal not set"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {vendor.documentVerificationStatus !== "VERIFIED" && (
            <Button onClick={() => handleVerify("VERIFIED")}>
              <BadgeCheck className="mr-2 h-4 w-4" />
              Verify & Allow Login
            </Button>
          )}
          {vendor.documentVerificationStatus !== "REJECTED" && (
            <Button variant="destructive" onClick={() => handleVerify("REJECTED")}>
              <BadgeX className="mr-2 h-4 w-4" />
              Reject
            </Button>
          )}
          <Link to={`/dashboard/vendors/${vendor._id}/edit`}>
            <Button variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit Vendor
            </Button>
          </Link>
        </div>
      </div>

      {(!vendor.documentVerificationStatus || vendor.documentVerificationStatus === "PENDING") && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          This vendor is <strong>pending verification</strong> and cannot login until you verify them.
        </div>
      )}
      {vendor.documentVerificationStatus === "REJECTED" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-900">
          This vendor is <strong>rejected</strong> and cannot login.
        </div>
      )}
      {vendor.documentVerificationStatus === "VERIFIED" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] text-emerald-900">
          This vendor is <strong>verified</strong> and can login with their email/password.
        </div>
      )}

      {!vendor.businessModel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
          Business model not set — choose <strong>Fixed</strong> or <strong>Bid</strong> below before
          assigning trips.
        </div>
      )}

      <Card title="Business model" icon={Handshake}>
        <p className="mb-4 text-sm text-slate-500">
          Decide how this vendor will work with True Way. Fixed = company % cut. Bid = bidding /
          first-accept on trips (next step).
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setDealType("FIXED")}
            className={cn(
              "rounded-xl border p-4 text-left transition",
              dealType === "FIXED"
                ? "border-indigo-400 bg-primary-light shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Percent className="h-4 w-4" />
            </div>
            <p className="font-semibold text-slate-900">Fixed</p>
            <p className="mt-1 text-[11px] text-muted">
              Har trip pe company ka fixed % share. Baaki vendor ko.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setDealType("BID")}
            className={cn(
              "rounded-xl border p-4 text-left transition",
              dealType === "BID"
                ? "border-violet-400 bg-violet-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            )}
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Gavel className="h-4 w-4" />
            </div>
            <p className="font-semibold text-slate-900">Bid</p>
            <p className="mt-1 text-[11px] text-muted">
              Trip pe bidding. Jo pehle accept karega, usko milegi.
            </p>
          </button>
        </div>

        {dealType === "FIXED" && (
          <div className="mt-4 space-y-3">
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Company share % <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={companyPercent}
                  onChange={(e) => setCompanyPercent(e.target.value)}
                  placeholder={`default ${defaultShare}`}
                />
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                  onClick={() => setCompanyPercent(String(defaultShare))}
                >
                  Use default ({defaultShare}%)
                </button>
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-slate-700">Vendor share %</p>
                <p className="flex h-10 items-center text-lg font-semibold text-slate-900">
                  {Number.isFinite(Number(companyPercent))
                    ? `${Math.round((100 - Number(companyPercent)) * 100) / 100}%`
                    : "—"}
                </p>
              </div>
              <div className="flex items-end">
                <p className="text-[11px] text-muted">
                  Example: trip ₹1000, company {companyPercent || "—"}% = ₹
                  {Number.isFinite(Number(companyPercent))
                    ? ((1000 * Number(companyPercent)) / 100).toFixed(0)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        {dealType === "BID" && (
          <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-[13px] text-violet-900">
            Bid model selected. Confirmed leads pe admin 15‑min bid open karega — yeh vendor ko
            max amount ke andar bid karne ka option milega.
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-muted">
            {vendor.businessModelSetAt
              ? `Last set ${new Date(vendor.businessModelSetAt).toLocaleString("en-IN")}`
              : "Not saved yet"}
          </p>
          <Button onClick={handleSaveBusinessModel} disabled={savingDeal}>
            {savingDeal ? "Saving..." : vendor.businessModel ? "Update business model" : "Save business model"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Company details" icon={Building2}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Company / Vendor Name" value={vendor.companyName} />
            <Info label="Vendor Type" value={vendor.vendorType?.name} />
            <Info label="Contact Person" value={vendor.contactPersonName} />
            <Info label="Owner Name" value={vendor.ownerName} />
            <Info label="GST Number" value={vendor.gstNumber} />
            <Info label="Registration No." value={vendor.companyRegistrationNumber} />
            <Info label="PAN" value={vendor.panNumber} />
            <Info label="Aadhaar" value={vendor.aadhaarNumber} />
          </dl>
        </Card>

        <Card title="Contact" icon={Phone}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Mobile" value={vendor.mobileNumber} />
            <Info label="Alternate" value={vendor.alternateContactNumber} />
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</dt>
              <dd className="mt-1 flex items-center gap-2 text-[13px] font-medium text-navy">
                <Mail className="h-4 w-4 text-slate-400" />
                {vendor.email || "-"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Address" icon={MapPin}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Address Line 1" value={vendor.addressLine1} />
            <Info label="Address Line 2" value={vendor.addressLine2} />
            <Info label="City" value={vendor.city} />
            <Info label="State" value={vendor.state} />
            <Info label="PIN Code" value={vendor.pinCode} />
            <Info label="Country" value={vendor.country} />
          </dl>
        </Card>

        <Card title="Bank details" icon={Landmark}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Account Holder" value={vendor.bankAccountHolderName} />
            <Info label="Bank Name" value={vendor.bankName} />
            <Info label="Account Number" value={vendor.bankAccountNumber} />
            <Info label="IFSC" value={vendor.ifscCode} />
          </dl>
        </Card>

        <Card title="Emergency contact" icon={ShieldAlert}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={vendor.emergencyContactName} />
            <Info label="Relationship" value={vendor.emergencyContactRelationship} />
            <Info label="Number" value={vendor.emergencyContactNumber} />
          </dl>
        </Card>

        <Card title="Documents">
          {(() => {
            const checklist = [
              { key: "aadhaarDocument", label: "Aadhaar Document", doc: vendor.aadhaarDocument },
              { key: "panDocument", label: "PAN Document", doc: vendor.panDocument },
              { key: "cancelledCheque", label: "Cancelled Cheque", doc: vendor.cancelledCheque },
              {
                key: "companyRegistrationDocument",
                label: "Company Registration",
                doc: vendor.companyRegistrationDocument,
              },
              { key: "gstCertificate", label: "GST Certificate", doc: vendor.gstCertificate },
            ];
            const pending = checklist.filter((d) => !d.doc?.url);
            if (!pending.length) return null;
            return (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                  Pending ({pending.length})
                </p>
                <ul className="mt-1 space-y-0.5">
                  {pending.map((d) => (
                    <li key={d.key} className="text-sm text-amber-950">
                      • {d.label}
                    </li>
                  ))}
                </ul>
                {vendor.documentReminderSentAt ? (
                  <p className="mt-2 text-[11px] text-amber-800/80">
                    Last reminder:{" "}
                    {new Date(vendor.documentReminderSentAt).toLocaleString("en-IN")} · sent{" "}
                    {vendor.documentReminderCount || 0} time(s)
                  </p>
                ) : null}
              </div>
            );
          })()}
          <div className="grid gap-2 sm:grid-cols-2">
            <DocLink label="Cancelled Cheque" doc={vendor.cancelledCheque} />
            <DocLink label="Aadhaar Document" doc={vendor.aadhaarDocument} />
            <DocLink label="PAN Document" doc={vendor.panDocument} />
            <DocLink label="Company Registration" doc={vendor.companyRegistrationDocument} />
            <DocLink label="GST Certificate" doc={vendor.gstCertificate} />
          </div>
          {vendor.otherDocuments?.length ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Other documents</p>
              {vendor.otherDocuments.map((doc) => (
                <DocLink key={doc._id || doc.url} label={doc.originalName || "Document"} doc={doc} />
              ))}
            </div>
          ) : null}
        </Card>
      </div>

      {vendor.internalNotes ? (
        <Card title="Internal notes">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{vendor.internalNotes}</p>
        </Card>
      ) : null}
    </div>
  );
}
