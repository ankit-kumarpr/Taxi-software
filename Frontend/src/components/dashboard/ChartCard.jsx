import { cn } from "../../utils/cn";

export function ChartCard({ title, subtitle, action, children, className, tone = "blue" }) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-surface p-4 shadow-sm",
        className
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-semibold text-navy">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
