import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { leadService } from "../services/leadService";

const LeadCountsContext = createContext({
  total: 0,
  byStatus: {},
  loading: false,
  refresh: async () => {},
});

export function LeadCountsProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [total, setTotal] = useState(0);
  const [byStatus, setByStatus] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.userType !== "ADMIN") {
      setTotal(0);
      setByStatus({});
      return;
    }
    try {
      setLoading(true);
      const res = await leadService.statusCounts();
      const data = res.data.data || {};
      setTotal(Number(data.total) || 0);
      setByStatus(data.byStatus || {});
    } catch {
      // Keep last known counts if refresh fails
    } finally {
      setLoading(false);
    }
  }, [user?.userType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when navigating under leads (status changes, deletes, etc.)
  useEffect(() => {
    if (user?.userType !== "ADMIN") return;
    if (!location.pathname.startsWith("/dashboard/leads")) return;
    refresh();
  }, [location.pathname, user?.userType, refresh]);

  const value = useMemo(
    () => ({ total, byStatus, loading, refresh }),
    [total, byStatus, loading, refresh]
  );

  return <LeadCountsContext.Provider value={value}>{children}</LeadCountsContext.Provider>;
}

export function useLeadCounts() {
  return useContext(LeadCountsContext);
}
