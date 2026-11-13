import { cn } from "../../utils/cn";

export function FormField({ label, required, hint, children, className = "" }) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? (
        <label className="ui-label">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function FormSection({ title, description, icon: Icon, children, className = "", actions = null }) {
  return (
    <section className={cn("rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-start gap-2.5">
          {Icon ? (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon className="h-3.5 w-3.5" />
            </div>
          ) : null}
          <div>
            <h2 className="text-[14px] font-semibold text-navy">{title}</h2>
            {description ? <p className="mt-0.5 text-[12px] text-muted">{description}</p> : null}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, description, icon: Icon, actions = null, badges = null }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-2.5">
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div>
          <h1 className="ui-page-title">{title}</h1>
          {description ? <p className="ui-page-subtitle">{description}</p> : null}
          {badges ? <div className="mt-2 flex flex-wrap gap-1.5">{badges}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatusBadge({ status, className = "" }) {
  const tone =
    status === "ACTIVE" || status === "VERIFIED"
      ? "bg-emerald-50 text-success"
      : status === "INACTIVE" || status === "PENDING"
        ? "bg-amber-50 text-warning"
        : status === "BLOCKED" || status === "REJECTED" || status === "CANCELLED"
          ? "bg-red-50 text-danger"
          : "bg-slate-100 text-muted";

  return (
    <span className={cn("ui-badge font-semibold uppercase tracking-wide", tone, className)}>
      {status || "—"}
    </span>
  );
}

export function MetaBadge({ children, className = "" }) {
  return (
    <span className={cn("ui-badge bg-slate-100 font-semibold uppercase tracking-wide text-muted", className)}>
      {children}
    </span>
  );
}

export function InfoRow({ label, value, className = "" }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-medium text-navy">{value || "—"}</dd>
    </div>
  );
}

export function EmptyState({ title, description, action = null }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-[13px] font-medium text-navy">{title}</p>
      {description ? <p className="mt-1 text-[12px] text-muted">{description}</p> : null}
      {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
    </div>
  );
}
