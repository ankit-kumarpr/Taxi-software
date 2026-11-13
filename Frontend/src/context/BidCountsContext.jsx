import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { bidService } from "../services/bidService";

const BidCountsContext = createContext({
  total: 0,
  byStatus: {},
  loading: false,
  refresh: async () => {},
});

export function BidCountsProvider({ children }) {
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
      const res = await bidService.statusCounts();
      const data = res.data.data || {};
      setTotal(Number(data.total) || 0);
      setByStatus(data.byStatus || {});
    } catch {
      // keep last
    } finally {
      setLoading(false);
    }
  }, [user?.userType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (user?.userType !== "ADMIN") return;
    if (!location.pathname.startsWith("/dashboard/live-bids")) return;
    refresh();
  }, [location.pathname, user?.userType, refresh]);

  const value = useMemo(
    () => ({ total, byStatus, loading, refresh }),
    [total, byStatus, loading, refresh]
  );

  return <BidCountsContext.Provider value={value}>{children}</BidCountsContext.Provider>;
}

export function useBidCounts() {
  return useContext(BidCountsContext);
}
