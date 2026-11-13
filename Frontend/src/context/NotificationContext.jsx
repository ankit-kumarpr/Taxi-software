import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import {
  notificationService,
  isFollowSticky,
} from "../services/notificationService";
import { bidService } from "../services/bidService";
import { getSocket } from "../utils/socket";

const NotificationContext = createContext(null);

const TOAST_TTL_MS = 30_000;
const POLL_MS = 12_000;
const SEEN_CAP = 200;

const storageKey = (userId) => `notif-toast-seen:${userId}`;

function loadSeenIds(userId) {
  if (!userId) return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.slice(-SEEN_CAP) : []);
  } catch {
    return new Set();
  }
}

function persistSeenIds(userId, set) {
  if (!userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...set].slice(-SEEN_CAP)));
  } catch {
    // ignore
  }
}

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const isAdmin = user?.userType === "ADMIN";
  const isVendor = user?.userType === "VENDOR";
  const enabled = isAdmin || isVendor;
  const userId = user?._id || user?.id || null;

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const seenToastIds = useRef(new Set());
  const sessionHiddenSticky = useRef(new Set());
  const toastTimers = useRef(new Map());
  const bootstrapped = useRef(false);
  const panelOpenRef = useRef(false);

  useEffect(() => {
    seenToastIds.current = loadSeenIds(userId);
    sessionHiddenSticky.current = new Set();
    bootstrapped.current = false;
  }, [userId]);

  const rememberSeen = useCallback(
    (ids) => {
      let changed = false;
      for (const id of ids) {
        if (!id || seenToastIds.current.has(id)) continue;
        seenToastIds.current.add(id);
        changed = true;
      }
      if (changed) persistSeenIds(userId, seenToastIds.current);
    },
    [userId]
  );

  const clearToastTimer = useCallback((id) => {
    const t = toastTimers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      toastTimers.current.delete(id);
    }
  }, []);

  const dismissToast = useCallback(
    (id, { soft = false } = {}) => {
      clearToastTimer(id);
      setToasts((prev) => {
        const target = prev.find((t) => t._id === id);
        if (soft && target && isFollowSticky(target)) {
          sessionHiddenSticky.current.add(id);
        }
        return prev.filter((t) => t._id !== id);
      });
    },
    [clearToastTimer]
  );

  const pushToast = useCallback(
    (notification, { sticky = false } = {}) => {
      if (!notification?._id) return;

      if (sticky || isFollowSticky(notification)) {
        if (sessionHiddenSticky.current.has(notification._id)) return;
      } else {
        if (seenToastIds.current.has(notification._id)) return;
        rememberSeen([notification._id]);
      }

      setToasts((prev) => {
        if (prev.some((t) => t._id === notification._id)) return prev;
        return [notification, ...prev].slice(0, 5);
      });

      clearToastTimer(notification._id);
      if (!sticky && !isFollowSticky(notification)) {
        const timer = window.setTimeout(() => dismissToast(notification._id), TOAST_TTL_MS);
        toastTimers.current.set(notification._id, timer);
      }
    },
    [rememberSeen, dismissToast, clearToastTimer]
  );

  const refreshAdmin = useCallback(async () => {
    const [countRes, listRes] = await Promise.all([
      notificationService.unreadCount(),
      notificationService.list({ page: 1, limit: 30 }),
    ]);

    const unread = countRes.data?.data?.unreadCount ?? 0;
    const fresh = countRes.data?.data?.fresh || [];
    const stickyFollowUps = countRes.data?.data?.stickyFollowUps || [];
    const list = listRes.data?.data || [];

    setUnreadCount(unread);
    setItems(list);

    for (const n of [...stickyFollowUps].reverse()) {
      pushToast(n, { sticky: true });
    }

    if (!bootstrapped.current) {
      bootstrapped.current = true;
      const stickyIds = new Set(stickyFollowUps.map((n) => n._id));
      rememberSeen(fresh.filter((n) => !stickyIds.has(n._id)).map((n) => n._id));
      return;
    }

    for (const n of [...fresh].reverse()) {
      if (isFollowSticky(n)) continue;
      pushToast(n);
    }
  }, [pushToast, rememberSeen]);

  const refreshVendor = useCallback(async () => {
    const res = await bidService.notifications();
    const list = res.data?.data || [];
    const unread = res.data?.unread ?? list.filter((n) => !n.isRead).length;

    setItems(list);
    setUnreadCount(unread);

    if (!bootstrapped.current) {
      bootstrapped.current = true;
      rememberSeen(list.map((n) => n._id));
      return;
    }

    for (const n of [...list].filter((n) => !n.isRead).reverse()) {
      pushToast(n);
    }
  }, [pushToast, rememberSeen]);

  const refresh = useCallback(async () => {
    if (!token || !enabled) return;
    try {
      if (isAdmin) await refreshAdmin();
      else if (isVendor) await refreshVendor();
    } catch {
      // silent
    }
  }, [token, enabled, isAdmin, isVendor, refreshAdmin, refreshVendor]);

  useEffect(() => {
    if (!token || !enabled) {
      setItems([]);
      setUnreadCount(0);
      setToasts([]);
      bootstrapped.current = false;
      sessionHiddenSticky.current = new Set();
      return undefined;
    }

    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [token, enabled, refresh]);

  // Vendor: realtime socket → header bell + toast (any page)
  useEffect(() => {
    if (!token || !isVendor) return undefined;
    const s = getSocket();
    if (!s) return undefined;

    const onRealtime = () => {
      refresh();
    };

    s.on("bid:opened", onRealtime);
    s.on("bid:won", onRealtime);
    s.on("bid:lost", onRealtime);
    s.on("bid:expired", onRealtime);
    s.on("bid:updated", onRealtime);

    return () => {
      s.off("bid:opened", onRealtime);
      s.off("bid:won", onRealtime);
      s.off("bid:lost", onRealtime);
      s.off("bid:expired", onRealtime);
      s.off("bid:updated", onRealtime);
    };
  }, [token, isVendor, refresh]);

  const markRead = useCallback(
    async (id) => {
      try {
        let wasUnread = false;
        setItems((prev) =>
          prev.map((n) => {
            if (n._id !== id) return n;
            wasUnread = !n.isRead;
            return { ...n, isRead: true };
          })
        );
        if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
        rememberSeen([id]);
        sessionHiddenSticky.current.delete(id);
        dismissToast(id);
        if (isVendor) await bidService.markNotificationRead(id);
        else await notificationService.markRead(id);
      } catch {
        // ignore
      }
    },
    [dismissToast, rememberSeen, isVendor]
  );

  const markReadByLead = useCallback(
    async (leadId) => {
      if (!leadId || !isAdmin) return;
      try {
        await notificationService.markReadByLead(leadId);

        setToasts((prev) => {
          const keep = [];
          for (const n of prev) {
            const match =
              String(n.meta?.leadMongoId) === String(leadId) ||
              String(n.link || "").includes(`/leads/${leadId}`);
            if (match) {
              rememberSeen([n._id]);
              sessionHiddenSticky.current.delete(n._id);
              clearToastTimer(n._id);
            } else {
              keep.push(n);
            }
          }
          return keep;
        });

        setItems((prev) => {
          let cleared = 0;
          const next = prev.map((n) => {
            const match =
              !n.isRead &&
              (String(n.meta?.leadMongoId) === String(leadId) ||
                String(n.link || "").includes(`/leads/${leadId}`));
            if (!match) return n;
            cleared += 1;
            rememberSeen([n._id]);
            return { ...n, isRead: true };
          });
          if (cleared) setUnreadCount((c) => Math.max(0, c - cleared));
          return next;
        });
      } catch {
        // ignore
      }
    },
    [rememberSeen, clearToastTimer, isAdmin]
  );

  const markAllRead = useCallback(async () => {
    try {
      if (isVendor) await bidService.markNotificationsRead();
      else await notificationService.markAllRead();
      rememberSeen(items.map((n) => n._id));
      sessionHiddenSticky.current = new Set();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setToasts([]);
    } catch {
      // ignore
    }
  }, [items, rememberSeen, isVendor]);

  const followUpPending = useMemo(
    () => items.some((n) => !n.isRead && isFollowSticky(n)) || toasts.some((t) => isFollowSticky(t)),
    [items, toasts]
  );

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      toasts,
      blink: unreadCount > 0 || followUpPending,
      followUpPending,
      refresh,
      markRead,
      markReadByLead,
      markAllRead,
      dismissToast,
      panelOpenRef,
      toastTtlMs: TOAST_TTL_MS,
      isVendor,
    }),
    [
      items,
      unreadCount,
      toasts,
      followUpPending,
      refresh,
      markRead,
      markReadByLead,
      markAllRead,
      dismissToast,
      isVendor,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
};
