import { useAuth } from "../../context/AuthContext";

/** Renders children only if user has permission (any of list if array). */
export function Can({ permission, children, fallback = null }) {
  const { can, canAny } = useAuth();
  const ok = Array.isArray(permission) ? canAny(permission) : can(permission);
  return ok ? children : fallback;
}
