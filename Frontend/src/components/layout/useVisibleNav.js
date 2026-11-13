import { navigationData } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useLeadCounts } from "../../context/LeadCountsContext";
import { useVendorCounts } from "../../context/VendorCountsContext";
import { useAccountsCounts } from "../../context/AccountsCountsContext";
import { useBidCounts } from "../../context/BidCountsContext";

function resolveCount(child, leadCounts, vendorCounts, accountsCounts, bidCounts) {
  if (!child.countKey) return undefined;

  const source = child.countSource || "leads";
  if (source === "vendors") {
    if (child.countKey === "ALL") return vendorCounts.total;
    if (String(child.countKey).startsWith("VERIFY_")) {
      const key = child.countKey.replace("VERIFY_", "");
      return vendorCounts.byVerification?.[key] ?? 0;
    }
    return vendorCounts.byStatus?.[child.countKey] ?? 0;
  }

  if (source === "accounts") {
    return accountsCounts.counts?.[child.countKey] ?? 0;
  }

  if (source === "bids") {
    if (child.countKey === "ALL") return bidCounts.total;
    return bidCounts.byStatus?.[child.countKey] ?? 0;
  }

  if (child.countKey === "ALL") return leadCounts.total;
  return leadCounts.byStatus?.[child.countKey] ?? 0;
}

export function useVisibleNav() {
  const { hasRole, canAny, user } = useAuth();
  const leadCounts = useLeadCounts();
  const vendorCounts = useVendorCounts();
  const accountsCounts = useAccountsCounts();
  const bidCounts = useBidCounts();

  const allowedByPerm = (needed) => {
    if (!needed) return true;
    // Vendor/Driver ignore admin permission keys
    if (user?.userType !== "ADMIN") return true;
    return canAny(Array.isArray(needed) ? needed : [needed]);
  };

  return navigationData
    .map((group) => {
      const items = group.items.flatMap((item) => {
        if (item.allowedRoles && !hasRole(item.allowedRoles)) return [];
        if (!allowedByPerm(item.permissionsNeeded)) return [];
        if (item.children?.length) {
          const children = item.children
            .filter((child) => allowedByPerm(child.permissionsNeeded))
            .map((child) => ({
              ...child,
              count: resolveCount(child, leadCounts, vendorCounts, accountsCounts, bidCounts),
            }));
          return children.length ? [{ ...item, children }] : [];
        }
        return [item];
      });
      return { ...group, items };
    })
    .filter((group) => group.items.length > 0);
}
