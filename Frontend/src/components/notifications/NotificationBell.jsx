import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarClock, CheckCheck, ClipboardPlus, Gavel, Trophy, Handshake } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { cn } from "../../utils/cn";

const typeIcon = {
  NEW_LEAD: ClipboardPlus,
  FOLLOW_UP_DUE: CalendarClock,
  FOLLOW_UP_SCHEDULED: Bell,
  BID_OPENED: Gavel,
  BID_UPDATED: Gavel,
  BID_WON: Trophy,
  BID_LOST: Gavel,
  BID_EXPIRED: Gavel,
  OFFER_FIXED: Handshake,
};

export function NotificationBell() {
  const { items, unreadCount, blink, followUpPending, markRead, markAllRead, refresh } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onPointer = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        title="Notifications"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) refresh();
        }}
        className={cn(
          "relative rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-navy",
          blink && "animate-notif-blink text-accent",
          followUpPending && "ring-2 ring-accent/40"
        )}
      >
        <Bell className={cn("h-5 w-5", blink && "fill-accent/20")} />
        {unreadCount > 0 ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white shadow-sm",
              followUpPending && "animate-notif-blink"
            )}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-navy">Notifications</p>
              <p className="text-xs text-muted">{unreadCount} unread</p>
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-blue-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>

          <ul className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">No notifications yet</li>
            ) : (
              items.map((n) => {
                const Icon = typeIcon[n.type] || Bell;
                return (
                  <li key={n._id} className={cn("border-b border-border last:border-0", !n.isRead && "bg-blue-50/40")}>
                    <Link
                      to={n.link || "/dashboard/leads"}
                      onClick={() => {
                        if (!n.isRead) markRead(n._id);
                        setOpen(false);
                      }}
                      className="flex gap-3 px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          n.type === "FOLLOW_UP_DUE" ? "bg-red-50 text-accent" : "bg-blue-50 text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-navy">{n.title}</p>
                          {!n.isRead ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">{n.message}</p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
