import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import api from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = Cookies.get("token");

      if (savedToken && savedToken !== "undefined" && savedToken !== "null") {
        setToken(savedToken);
        try {
          const response = await api.get("auth/me");
          const data = response.data?.data;
          setUser(data);
          Cookies.set("user", JSON.stringify(data), { expires: 1 });
        } catch (e) {
          console.error("Failed to fetch user profile", e);
          if (e.response?.status === 401) {
            logout();
          } else {
            const savedUser = Cookies.get("user");
            if (savedUser) {
              try {
                setUser(JSON.parse(savedUser));
              } catch {
                logout();
              }
            }
          }
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    Cookies.set("token", authToken, { expires: 1 });
    Cookies.set("user", JSON.stringify(userData), { expires: 1 });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    Cookies.remove("token");
    Cookies.remove("user");
  };

  const refreshUser = useCallback(async (nextUser) => {
    if (nextUser) {
      setUser(nextUser);
      Cookies.set("user", JSON.stringify(nextUser), { expires: 1 });
      return nextUser;
    }
    const savedToken = Cookies.get("token");
    if (!savedToken) return null;
    try {
      const response = await api.get("auth/me");
      const data = response.data?.data;
      setUser(data);
      Cookies.set("user", JSON.stringify(data), { expires: 1 });
      return data;
    } catch {
      return null;
    }
  }, []);

  const hasRole = useCallback(
    (roles) => {
      if (!user) return false;
      if (!roles || roles.length === 0) return true;
      return roles.includes(user.userType);
    },
    [user]
  );

  const permissions = useMemo(() => {
    if (!user) return [];
    if (user.userType !== "ADMIN") return [];
    if (user.isSuperAdmin || user.isSuperAdmin == null) return ["*"];
    return Array.isArray(user.permissions) ? user.permissions : [];
  }, [user]);

  const can = useCallback(
    (permission) => {
      if (!user) return false;
      if (user.userType !== "ADMIN") return false;
      if (user.isSuperAdmin || user.isSuperAdmin == null) return true;
      if (!permission) return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [user, permissions]
  );

  const canAny = useCallback(
    (list) => {
      if (!user) return false;
      if (user.userType !== "ADMIN") return false;
      if (user.isSuperAdmin || user.isSuperAdmin == null) return true;
      if (!list?.length) return true;
      if (permissions.includes("*")) return true;
      return list.some((p) => permissions.includes(p));
    },
    [user, permissions]
  );

  const canAll = useCallback(
    (list) => {
      if (!user) return false;
      if (user.userType !== "ADMIN") return false;
      if (user.isSuperAdmin || user.isSuperAdmin == null) return true;
      if (!list?.length) return true;
      if (permissions.includes("*")) return true;
      return list.every((p) => permissions.includes(p));
    },
    [user, permissions]
  );

  /** Back-compat: hasPermission("x") or hasPermission() for any admin */
  const hasPermission = useCallback(
    (permission) => {
      if (!permission) return user?.userType === "ADMIN";
      return can(permission);
    },
    [user, can]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        hasRole,
        hasPermission,
        can,
        canAny,
        canAll,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
