import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { vendorService } from "../services/vendorService";

const VendorCountsContext = createContext({
  total: 0,
  byStatus: {},
  byVerification: {},
  loading: false,
  refresh: async () => {},
});

export function VendorCountsProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [total, setTotal] = useState(0);
  const [byStatus, setByStatus] = useState({});
  const [byVerification, setByVerification] = useState({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (user?.userType !== "ADMIN") {
      setTotal(0);
      setByStatus({});
      setByVerification({});
      return;
    }
    try {
      setLoading(true);
      const res = await vendorService.statusCounts();
      const data = res.data.data || {};
      setTotal(Number(data.total) || 0);
      setByStatus(data.byStatus || {});
      setByVerification(data.byVerification || {});
    } catch {
      // Keep last known counts
    } finally {
      setLoading(false);
    }
  }, [user?.userType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (user?.userType !== "ADMIN") return;
    if (!location.pathname.startsWith("/dashboard/vendors")) return;
    refresh();
  }, [location.pathname, user?.userType, refresh]);

  const value = useMemo(
    () => ({ total, byStatus, byVerification, loading, refresh }),
    [total, byStatus, byVerification, loading, refresh]
  );

  return <VendorCountsContext.Provider value={value}>{children}</VendorCountsContext.Provider>;
}

export function useVendorCounts() {
  return useContext(VendorCountsContext);
}
