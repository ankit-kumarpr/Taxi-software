import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../../utils/cn";
import { MiniSparkline } from "./MiniSparkline";

const accents = {
  blue: {
    icon: "bg-primary-light text-primary",
    spark: "#7C3AED",
  },
  red: {
    icon: "bg-red-50 text-danger",
    spark: "#E5484D",
  },
  mixed: {
    icon: "bg-primary-light text-primary",
    spark: "#7C3AED",
  },
};

export function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  to,
  change,
  sparkData,
  accent = "blue",
  loading,
}) {
  const showChange = typeof change === "number" && Number.isFinite(change);
  const isUp = showChange && change > 0;
  const isDown = showChange && change < 0;
  const theme = accents[accent] || accents.blue;
  const hasSpark = Array.isArray(sparkData) && sparkData.length > 0;

  const content = (
    <div
      className={cn(
        "group rounded-xl border border-border bg-surface p-3.5 shadow-sm transition",
        to && "hover:border-primary/25 hover:shadow"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted">{title}</p>
          {loading ? (
            <div className="mt-1.5 h-7 w-16 animate-pulse rounded-md bg-slate-100" />
          ) : (
            <p className="mt-1 text-xl font-bold tracking-tight text-navy">{value ?? "—"}</p>
          )}
        </div>
        {Icon ? (
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", theme.icon)}>
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {showChange ? (
            <div
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                isUp && "text-success",
                isDown && "text-danger",
                !isUp && !isDown && "text-muted"
              )}
            >
              {isUp ? <TrendingUp className="h-3 w-3" /> : null}
              {isDown ? <TrendingDown className="h-3 w-3" /> : null}
              {isUp ? "+" : ""}
              {change}%
              <span className="ml-1 font-normal text-muted">vs last week</span>
            </div>
          ) : null}
          {hint ? (
            <p className={cn("truncate text-[11px] text-muted", showChange ? "mt-0.5" : "")}>{hint}</p>
          ) : null}
        </div>
        {hasSpark ? (
          <div className="h-8 w-20 shrink-0">
            <MiniSparkline data={sparkData} color={theme.spark} />
          </div>
        ) : null}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
