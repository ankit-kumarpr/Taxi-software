import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit2, Car, FileText, User, IdCard, Shield } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "../../components/ui/Button";
import { cn } from "../../utils/cn";
import { vehicleService } from "../../services/vehicleService";
import { useAuth } from "../../context/AuthContext";
import { flattenRegCheckForDisplay, pickImageUrl } from "../../utils/regCheckDisplay";

const apiOrigin = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "");

const fileUrl = (path) => {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${apiOrigin}${path.startsWith("/") ? path : `/${path}`}`;
};

function Info({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-[13px] font-medium text-navy break-words">{String(value)}</dd>
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

export function VehicleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.userType === "ADMIN";
  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await vehicleService.getById(id);
        setVehicle(res.data.data);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load vehicle");
        navigate("/dashboard/vehicles");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const rc = vehicle?.rcDetails || null;
  const allRcRows = useMemo(() => {
    if (!vehicle) return [];
    return flattenRegCheckForDisplay({
      raw: vehicle.regCheckData,
      details: vehicle.rcDetails,
      flat: vehicle.rcDetails?.flat,
    });
  }, [vehicle]);
  const rcImage = useMemo(() => pickImageUrl(vehicle?.regCheckData || vehicle?.rcDetails), [vehicle]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading vehicle...</div>;
  }

  if (!vehicle) return null;

  const createdAt = vehicle.createdAt
    ? new Date(vehicle.createdAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const hasRc =
    rc &&
    Object.values(rc).some((v) => {
      if (v == null || v === "") return false;
      if (typeof v === "object") return Object.keys(v || {}).length > 0;
      return true;
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/dashboard/vehicles"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to vehicles
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="ui-page-title">{vehicle.vehicleName}</h1>
            <span className="rounded-md bg-primary-light px-2 py-0.5 text-sm font-semibold text-primary">
              {vehicle.vehicleId}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-slate-600">{vehicle.vehicleNumber}</p>
          {(rc?.make || rc?.model) && (
            <p className="ui-page-subtitle">
              {[rc.make, rc.model, rc.variant].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="ui-page-subtitle">Created {createdAt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                vehicle.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}
            >
              {vehicle.status}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {vehicle.vehicleType?.name || "—"}
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {vehicle.fuelType}
            </span>
            {rc?.colour ? (
              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                {rc.colour}
              </span>
            ) : null}
          </div>
        </div>
        <Link to={`/dashboard/vehicles/${vehicle._id}/edit`}>
          <Button>
            <Edit2 className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="CRM vehicle details" icon={Car}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Number" value={vehicle.vehicleNumber} />
            <Info label="Name / model" value={vehicle.vehicleName} />
            <Info label="Our vehicle type" value={vehicle.vehicleType?.name} />
            <Info label="Fuel" value={vehicle.fuelType} />
            <Info label="Transmission" value={vehicle.transmission} />
            <Info label="Seating" value={vehicle.seatingCapacity} />
          </dl>
        </Card>

        <Card title="Assignment" icon={User}>
          <dl className="grid gap-4 sm:grid-cols-2">
            {isAdmin ? (
              <Info
                label="Vendor"
                value={
                  vehicle.vendor
                    ? `${vehicle.vendor.companyName} (${vehicle.vendor.vendorId})`
                    : "—"
                }
              />
            ) : null}
            <Info
              label="Assigned Driver"
              value={
                vehicle.assignedDriver
                  ? `${vehicle.assignedDriver.name} (${vehicle.assignedDriver.driverId})`
                  : "Unassigned"
              }
            />
            {vehicle.assignedDriver?.mobileNumber ? (
              <Info label="Driver Mobile" value={vehicle.assignedDriver.mobileNumber} />
            ) : null}
          </dl>
        </Card>

        {allRcRows.length || hasRc ? (
          <Card title="RC / RegCheck details (complete)" icon={IdCard} className="lg:col-span-2">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              {rcImage || rc?.imageUrl ? (
                <img
                  src={rcImage || rc.imageUrl}
                  alt={rc?.description || vehicle.vehicleName}
                  className="h-36 w-full max-w-[220px] rounded-xl border border-slate-200 bg-slate-50 object-contain"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  {rc?.description || vehicle.vehicleName}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Fetched{" "}
                  {vehicle.regCheckFetchedAt
                    ? new Date(vehicle.regCheckFetchedAt).toLocaleString("en-IN")
                    : "—"}
                  · {allRcRows.length} API fields (empty = —)
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allRcRows
                .filter((row) => !/imageurl$/i.test(row.key))
                .map((row) => (
                  <div key={row.key} className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5">
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
          </Card>
        ) : null}

        <Card title="Documents & images" icon={FileText} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DocLink label="RC Document" doc={vehicle.rcDocument} />
            <DocLink label="Insurance" doc={vehicle.insuranceDocument} />
            <DocLink label="PUC" doc={vehicle.pucDocument} />
            <DocLink label="Fitness Certificate" doc={vehicle.fitnessCertificate} />
            <DocLink label="Permit" doc={vehicle.permitDocument} />
            <DocLink label="Vehicle Photo" doc={vehicle.vehiclePhoto} />
            {(vehicle.otherImages || []).map((doc, idx) => (
              <DocLink key={doc._id || doc.url || idx} label={`Other image ${idx + 1}`} doc={doc} />
            ))}
          </div>
        </Card>

        {vehicle.regCheckData ? (
          <Card title="Raw API snapshot" icon={Shield} className="lg:col-span-2">
            <pre className="max-h-64 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(vehicle.regCheckData, null, 2)}
            </pre>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
