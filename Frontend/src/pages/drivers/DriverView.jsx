import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Edit2,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Car,
  Store,
  CheckCircle2,
  FileText,
  BadgeCheck,
  BadgeX,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { cn } from "../../utils/cn";
import { driverService } from "../../services/driverService";
import { invoicePdfHref, tripService } from "../../services/tripService";
import { useAuth } from "../../context/AuthContext";

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
      <dd className="mt-1 text-[13px] font-medium text-navy break-words">{value || "—"}</dd>
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

export function DriverView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";
  const [driver, setDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const res = await driverService.getById(id);
      setDriver(res.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load driver");
      navigate("/dashboard/drivers");
    } finally {
      setLoading(false);
    }
  };

  const kycLabel = (status) => {
    if (status === "VERIFIED") return "Verified";
    if (status === "REJECTED") return "Rejected";
    return "Pending";
  };

  const submitKyc = async (documentVerificationStatus, reason = "") => {
    try {
      setVerifying(true);
      const res = await driverService.verify(
        id,
        documentVerificationStatus,
        reason || undefined
      );
      toast.success(res.data.message || "Updated");
      setRejectOpen(false);
      setRejectionReason("");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update KYC");
    } finally {
      setVerifying(false);
    }
  };

  const handleVerify = async (documentVerificationStatus) => {
    if (documentVerificationStatus === "REJECTED") {
      setRejectionReason("");
      setRejectOpen(true);
      return;
    }
    const label =
      documentVerificationStatus === "VERIFIED" ? "verify KYC" : "mark KYC pending";
    if (!window.confirm(`Are you sure you want to ${label} for this driver?`)) return;
    await submitKyc(documentVerificationStatus);
  };

  const submitReject = async () => {
    const reason = rejectionReason.trim();
    if (!reason) {
      toast.error("Rejection reason is required");
      return;
    }
    await submitKyc("REJECTED", reason);
  };

  const openInvoice = async (trip) => {
    try {
      const res = isAdmin
        ? await tripService.adminInvoice(trip._id, { regenerate: 1 })
        : await tripService.vendorInvoice(trip._id, { regenerate: 1 });
      const url = res.data.data?.invoicePdfUrl;
      if (!url) {
        toast.error("Invoice not available");
        return;
      }
      setDriver((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          completedTripList: (prev.completedTripList || []).map((t) =>
            t._id === trip._id
              ? {
                  ...t,
                  invoiceId: res.data.data.invoiceId,
                  invoicePdfUrl: url,
                }
              : t
          ),
        };
      });
      window.open(invoicePdfHref(url), "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open invoice");
    }
  };

  useEffect(() => {
    load();
  }, [id, navigate]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading driver...</div>;
  }

  if (!driver) return null;

  const createdAt = driver.createdAt
    ? new Date(driver.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const dlExpiry = driver.dlExpiryDate
    ? new Date(driver.dlExpiryDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard/drivers"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to drivers
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-page-title">{driver.name}</h1>
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-sm font-semibold text-primary">
              {driver.driverId}
            </span>
          </div>
          <p className="ui-page-subtitle">Created {createdAt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                driver.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {driver.status}
            </span>
            {driver.assignedVendor ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {driver.assignedVendor.companyName} ({driver.assignedVendor.vendorId})
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Unassigned
              </span>
            )}
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                driver.documentVerificationStatus === "VERIFIED" &&
                  "bg-green-100 text-green-800",
                driver.documentVerificationStatus === "REJECTED" && "bg-red-100 text-red-800",
                (!driver.documentVerificationStatus ||
                  driver.documentVerificationStatus === "PENDING") &&
                  "bg-amber-100 text-amber-800"
              )}
            >
              KYC: {kycLabel(driver.documentVerificationStatus || "PENDING")}
            </span>
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {driver.completedTrips ?? 0} trips completed
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <>
              {driver.documentVerificationStatus !== "VERIFIED" ? (
                <Button
                  type="button"
                  disabled={verifying}
                  onClick={() => handleVerify("VERIFIED")}
                >
                  <BadgeCheck className="mr-2 h-4 w-4" />
                  Verify KYC
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                disabled={verifying}
                onClick={() => {
                  setRejectionReason("");
                  setRejectOpen(true);
                }}
              >
                <BadgeX className="mr-2 h-4 w-4" />
                Reject KYC
              </Button>
              {driver.documentVerificationStatus &&
              driver.documentVerificationStatus !== "PENDING" ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={verifying}
                  onClick={() => handleVerify("PENDING")}
                >
                  Mark pending
                </Button>
              ) : null}
            </>
          ) : null}
          {isAdmin && driver.status === "ACTIVE" && !driver.convertedToVendor ? (
            <Link to={`/dashboard/drivers/${driver._id}/become-vendor`}>
              <Button variant="outline">
                <Store className="mr-2 h-4 w-4" />
                Become Vendor
              </Button>
            </Link>
          ) : null}
          {driver.convertedToVendor ? (
            <Link to={`/dashboard/vendors/${driver.convertedToVendor}`}>
              <Button variant="outline">
                <Store className="mr-2 h-4 w-4" />
                View Vendor
              </Button>
            </Link>
          ) : null}
          <Link to={`/dashboard/drivers/${driver._id}/edit`}>
            <Button variant={isAdmin ? "outline" : "default"}>
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {(!driver.documentVerificationStatus ||
        driver.documentVerificationStatus === "PENDING") && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950">
          <strong>KYC status: Pending.</strong> Driver cannot login until admin verifies Aadhaar
          and driving licence.
        </div>
      )}
      {driver.documentVerificationStatus === "REJECTED" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-900">
          <strong>KYC status: Rejected.</strong> Driver login is blocked.
          {driver.documentRejectionReason ? (
            <p className="mt-1">
              Reason: <span className="font-medium">{driver.documentRejectionReason}</span>
            </p>
          ) : null}
        </div>
      )}
      {driver.documentVerificationStatus === "VERIFIED" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">
          <strong>KYC status: Verified.</strong> Driver can login and take trips.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contact" icon={Phone}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Mobile" value={driver.mobileNumber} />
            <Info label="Email" value={driver.email} />
            <div className="sm:col-span-2">
              <Info label="Address" value={driver.address} />
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
            {driver.email ? (
              <a href={`mailto:${driver.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-4 w-4" /> Email
              </a>
            ) : null}
            <a href={`tel:${driver.mobileNumber}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Phone className="h-4 w-4" /> Call
            </a>
          </div>
        </Card>

        <Card title="Licence & ID" icon={IdCard}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Aadhaar Number" value={driver.aadhaarNumber} />
            <Info label="Driving Licence" value={driver.drivingLicenceNumber} />
            <Info label="DL Expiry" value={dlExpiry} />
            {isAdmin ? (
              <Info
                label="Assigned Vendor"
                value={
                  driver.assignedVendor
                    ? `${driver.assignedVendor.companyName} (${driver.assignedVendor.vendorId})`
                    : "Unassigned"
                }
              />
            ) : null}
          </dl>
        </Card>

        <Card title="Documents" icon={Car}>
          <div className="grid gap-3 sm:grid-cols-2">
            <DocLink label="Aadhaar Document" doc={driver.aadhaarDocument} />
            <DocLink label="Driving Licence" doc={driver.drivingLicenceDocument} />
            <DocLink label="Profile Photo" doc={driver.profilePhoto} />
          </div>
          {(driver.otherDocuments || []).length ? (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Additional documents
              </p>
              {driver.otherDocuments.map((doc) => (
                <DocLink
                  key={doc._id || doc.url}
                  label={doc.name || doc.originalName || "Document"}
                  doc={doc}
                />
              ))}
            </div>
          ) : null}
        </Card>

        <Card title="Location" icon={MapPin}>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{driver.address || "—"}</p>
        </Card>

        <Card title="Completed trips" icon={CheckCircle2}>
          {(driver.completedTripList || []).length === 0 ? (
            <p className="text-sm text-slate-500">No completed trips yet.</p>
          ) : (
            <ul className="space-y-2">
              {driver.completedTripList.map((trip) => (
                <li
                  key={trip._id}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{trip.leadId}</p>
                    <span className="text-xs font-medium text-emerald-700">
                      ₹{Number(trip.grandTotal || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {trip.customerName} ·{" "}
                    {trip.travelDate
                      ? new Date(trip.travelDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-600">
                    {trip.pickupLocation} → {trip.dropLocation}
                  </p>
                  <button
                    type="button"
                    onClick={() => openInvoice(trip)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {trip.invoiceId || "Final invoice"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={rejectOpen}
        onClose={() => {
          if (verifying) return;
          setRejectOpen(false);
          setRejectionReason("");
        }}
        title="Reject KYC"
        description="Tell the driver why documents were rejected. This is required."
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              disabled={verifying}
              onClick={() => {
                setRejectOpen(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={verifying || !rejectionReason.trim()}
              onClick={submitReject}
            >
              <BadgeX className="mr-2 h-4 w-4" />
              {verifying ? "Rejecting…" : "Reject KYC"}
            </Button>
          </>
        }
      >
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Rejection reason <span className="text-red-500">*</span>
        </label>
        <textarea
          className="min-h-[110px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="e.g. Aadhaar image is blurry, DL expired…"
          disabled={verifying}
          autoFocus
        />
      </Modal>
    </div>
  );
}
