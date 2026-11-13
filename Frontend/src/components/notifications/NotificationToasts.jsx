import { Link } from "react-router-dom";
import { BellRing, CalendarClock, ClipboardPlus, Gavel, Trophy, Handshake, X } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { isFollowSticky } from "../../services/notificationService";
import { cn } from "../../utils/cn";

const typeMeta = {
  NEW_LEAD: {
    icon: ClipboardPlus,
    bar: "from-primary to-blue-400",
    badge: "bg-blue-50 text-primary",
    label: "New Lead",
    cta: "Open lead",
    fallbackLink: "/dashboard/leads",
  },
  FOLLOW_UP_DUE: {
    icon: CalendarClock,
    bar: "from-accent to-red-400",
    badge: "bg-red-50 text-accent",
    label: "Follow-up Due",
    cta: "Open lead",
    fallbackLink: "/dashboard/leads",
  },
  FOLLOW_UP_SCHEDULED: {
    icon: BellRing,
    bar: "from-primary to-accent",
    badge: "bg-primary-light text-primary",
    label: "Follow-up",
    cta: "Open lead",
    fallbackLink: "/dashboard/leads",
  },
  BID_OPENED: {
    icon: Gavel,
    bar: "from-amber-500 to-orange-400",
    badge: "bg-amber-50 text-amber-800",
    label: "New Bid",
    cta: "Open bids",
    fallbackLink: "/dashboard/vendor-bids",
  },
  BID_UPDATED: {
    icon: Gavel,
    bar: "from-amber-500 to-orange-400",
    badge: "bg-amber-50 text-amber-800",
    label: "Bid Update",
    cta: "Open bids",
    fallbackLink: "/dashboard/vendor-bids",
  },
  BID_WON: {
    icon: Trophy,
    bar: "from-emerald-500 to-teal-400",
    badge: "bg-emerald-50 text-emerald-800",
    label: "Bid Won",
    cta: "View offer",
    fallbackLink: "/dashboard/vendor-offers",
  },
  BID_LOST: {
    icon: Gavel,
    bar: "from-slate-400 to-slate-500",
    badge: "bg-slate-100 text-slate-700",
    label: "Bid Closed",
    cta: "View bids",
    fallbackLink: "/dashboard/vendor-bids?status=LOST",
  },
  BID_EXPIRED: {
    icon: Gavel,
    bar: "from-slate-400 to-slate-500",
    badge: "bg-slate-100 text-slate-700",
    label: "Bid Expired",
    cta: "View bids",
    fallbackLink: "/dashboard/vendor-bids?status=EXPIRED",
  },
  OFFER_FIXED: {
    icon: Handshake,
    bar: "from-indigo-500 to-blue-400",
    badge: "bg-primary-light text-primary",
    label: "Fixed Offer",
    cta: "View offers",
    fallbackLink: "/dashboard/vendor-offers",
  },
};

export function NotificationToasts() {
  const { toasts, dismissToast, markRead, toastTtlMs, isVendor } = useNotifications();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[80] flex w-[min(100vw-2rem,22rem)] flex-col gap-3 sm:right-6">
      {toasts.map((n) => {
        const meta = typeMeta[n.type] || (isVendor ? typeMeta.BID_OPENED : typeMeta.NEW_LEAD);
        const Icon = meta.icon;
        const sticky = isFollowSticky(n);
        return (
          <div
            key={n._id}
            className={cn(
              "pointer-events-auto overflow-hidden rounded-2xl border border-white/40 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.18)] backdrop-blur",
              sticky ? "animate-notif-fly ring-2 ring-accent/30" : "animate-notif-fly"
            )}
          >
            <div className={cn("h-1 bg-gradient-to-r", meta.bar)} />
            <div className="relative p-4">
              <button
                type="button"
                onClick={() => dismissToast(n._id, { soft: sticky })}
                className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                title={sticky ? "Hide for now (comes back on refresh until lead is opened)" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex gap-3 pr-6">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    meta.badge,
                    sticky && "animate-notif-blink"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      meta.badge
                    )}
                  >
                    {meta.label}
                    {sticky ? " · Open lead to clear" : ""}
                  </span>
                  <p className="mt-1 text-sm font-semibold text-navy">{n.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.message}</p>
                  {n.meta?.customerName ? (
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-medium">{n.meta.customerName}</span>
                      {n.meta.leadId ? ` · ${n.meta.leadId}` : ""}
                      {n.meta.followUpTime ? ` · ${n.meta.followUpDate} ${n.meta.followUpTime}` : ""}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    <Link
                      to={n.link || meta.fallbackLink}
                      onClick={() => markRead(n._id)}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-hover"
                    >
                      {meta.cta}
                    </Link>
                    {sticky ? (
                      <button
                        type="button"
                        onClick={() => dismissToast(n._id, { soft: true })}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-slate-100"
                      >
                        Hide for now
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markRead(n._id)}
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-muted hover:bg-slate-100"
                      >
                        Dismiss
                      </button>
                    )}
                    {!sticky ? (
                      <span className="ml-auto text-[10px] text-slate-400">
                        {Math.round(toastTtlMs / 1000)}s
                      </span>
                    ) : (
                      <span className="ml-auto text-[10px] font-semibold text-accent">Sticky</span>
                    )}
                  </div>
                </div>
              </div>

              {!sticky ? (
                <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full animate-notif-progress bg-gradient-to-r from-primary to-accent" />
                </div>
              ) : (
                <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-red-100">
                  <div className="h-full w-full animate-pulse bg-accent/70" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
