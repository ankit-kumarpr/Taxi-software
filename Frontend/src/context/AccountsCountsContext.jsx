import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { accountsService } from "../services/accountsService";

const AccountsCountsContext = createContext({
  counts: {},
  refresh: async () => {},
});

export function AccountsCountsProvider({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [counts, setCounts] = useState({});

  const refresh = useCallback(async () => {
    if (user?.userType !== "ADMIN") {
      setCounts({});
      return;
    }
    try {
      const res = await accountsService.navCounts();
      setCounts(res.data.data || {});
    } catch {
      /* keep last */
    }
  }, [user?.userType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (user?.userType !== "ADMIN") return;
    if (!location.pathname.startsWith("/dashboard/accounts")) return;
    refresh();
  }, [location.pathname, user?.userType, refresh]);

  const value = useMemo(() => ({ counts, refresh }), [counts, refresh]);
  return (
    <AccountsCountsContext.Provider value={value}>{children}</AccountsCountsContext.Provider>
  );
}

export function useAccountsCounts() {
  return useContext(AccountsCountsContext);
}
