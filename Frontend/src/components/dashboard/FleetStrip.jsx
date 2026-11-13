import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

/**
 * Compact “dispatch desk” strip — taxi ops quick jumps.
 */
export function FleetStrip({ items = [], loading }) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm transition",
              item.to && "hover:border-primary/30 hover:shadow-md"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white",
                item.tone === "yellow" && "bg-warning text-navy",
                item.tone === "red" && "bg-danger",
                item.tone === "blue" && "bg-primary",
                !item.tone && "bg-navy"
              )}
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">{item.label}</p>
              <p className="truncate text-[13px] font-semibold text-navy group-hover:text-primary">
                {item.value}
              </p>
            </div>
          </div>
        );
        return item.to ? (
          <Link key={item.label} to={item.to}>
            {inner}
          </Link>
        ) : (
          <div key={item.label}>{inner}</div>
        );
      })}
    </div>
  );
}
