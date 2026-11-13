import { MapPin } from "lucide-react";

export function TaxiHero({ title, subtitle, badge, meta }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-4 shadow-sm sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {badge ? (
            <p className="text-[11px] font-medium text-muted">{badge}</p>
          ) : null}
          <h1 className="mt-0.5 text-lg font-bold tracking-tight text-navy sm:text-xl">{title}</h1>
          {subtitle ? (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted">{subtitle}</p>
          ) : null}
          {meta ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted">
              <MapPin className="h-3 w-3 text-primary" />
              {meta}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
