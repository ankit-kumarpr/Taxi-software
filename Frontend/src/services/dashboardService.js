import { leadService } from "./leadService";
import { vendorService } from "./vendorService";
import { driverService } from "./driverService";
import { vehicleService } from "./vehicleService";

const safeList = async (fn, params = {}) => {
  try {
    const res = await fn(params);
    return {
      data: res.data?.data || [],
      total: res.data?.pagination?.total ?? (res.data?.data || []).length,
    };
  } catch {
    return { data: [], total: 0 };
  }
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
};

const countInRange = (items, from, to, dateKey = "createdAt") =>
  items.filter((item) => {
    const raw = item[dateKey];
    if (!raw) return false;
    const t = new Date(raw).getTime();
    return t >= from.getTime() && t < to.getTime();
  }).length;

const buildSparkline = (items, days = 7, dateKey = "createdAt") => {
  const points = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const from = daysAgo(i);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    points.push({
      label: from.toLocaleDateString("en-IN", { weekday: "short" }),
      value: countInRange(items, from, to, dateKey),
    });
  }
  return points;
};

/** Only return a real % when previous period has data. Otherwise null (UI hides it). */
const weekChange = (items, dateKey = "createdAt") => {
  const thisWeekFrom = daysAgo(6);
  const nextDay = daysAgo(-1);
  const prevWeekFrom = daysAgo(13);
  const prevWeekTo = daysAgo(6);
  const current = countInRange(items, thisWeekFrom, nextDay, dateKey);
  const previous = countInRange(items, prevWeekFrom, prevWeekTo, dateKey);
  if (previous === 0) return { current, previous, change: null };
  return {
    current,
    previous,
    change: Math.round(((current - previous) / previous) * 100),
  };
};

export async function fetchAdminDashboard() {
  const [
    leadsPage,
    leadsRecent,
    vendorsPage,
    vendorsPending,
    vendorsVerified,
    vendorsRecent,
    driversPage,
    driversActive,
    driversRecent,
    vehiclesPage,
    vehiclesActive,
    vehiclesRecent,
  ] = await Promise.all([
    safeList(leadService.list, { page: 1, limit: 1 }),
    safeList(leadService.list, { page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    safeList(vendorService.list, { page: 1, limit: 1 }),
    safeList(vendorService.list, { page: 1, limit: 1, documentVerificationStatus: "PENDING" }),
    safeList(vendorService.list, { page: 1, limit: 1, documentVerificationStatus: "VERIFIED" }),
    safeList(vendorService.list, { page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    safeList(driverService.list, { page: 1, limit: 1 }),
    safeList(driverService.list, { page: 1, limit: 1, status: "ACTIVE" }),
    safeList(driverService.list, { page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    safeList(vehicleService.list, { page: 1, limit: 1 }),
    safeList(vehicleService.list, { page: 1, limit: 1, status: "ACTIVE" }),
    safeList(vehicleService.list, { page: 1, limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
  ]);

  const leadItems = leadsRecent.data;
  const statusKeys = [
    "PENDING",
    "NEW",
    "FOLLOW_UP",
    "QUOTATION_SEND",
    "CONFIRMED",
    "VENDOR_OFFERED",
    "VENDOR_ACCEPTED",
    "DRIVER_ASSIGNED",
    "LOST",
    "PAYMENT_PENDING",
  ];
  const statusCounts = Object.fromEntries(statusKeys.map((k) => [k, 0]));
  const today = startOfDay(new Date());
  let overdueFollowUps = 0;

  // Flatten follow-ups for sparkline (by followUpDate)
  const followUpEvents = [];
  for (const lead of leadItems) {
    if (statusCounts[lead.status] !== undefined) statusCounts[lead.status] += 1;
    if (lead.nextFollowUpDate && startOfDay(lead.nextFollowUpDate) < today) {
      overdueFollowUps += 1;
    }
    for (const fu of lead.followUps || []) {
      if (fu.followUpDate) {
        followUpEvents.push({ createdAt: fu.followUpDate });
      }
    }
  }

  const confirmedLeads = leadItems.filter((l) => l.status === "CONFIRMED");
  const pipelineLeads = leadItems.filter((l) => l.status === "FOLLOW_UP" || l.status === "PENDING");
  const pendingVendors = vendorsRecent.data.filter((v) => v.documentVerificationStatus === "PENDING");

  const leadWeek = weekChange(leadItems);
  const vendorWeek = weekChange(vendorsRecent.data);
  const driverWeek = weekChange(driversRecent.data);
  const vehicleWeek = weekChange(vehiclesRecent.data);
  const confirmedWeek = weekChange(confirmedLeads);
  const followUpWeek = weekChange(followUpEvents);

  const sourceMap = {};
  for (const lead of leadItems) {
    const key = lead.leadSource || "OTHER";
    sourceMap[key] = (sourceMap[key] || 0) + 1;
  }

  const recentActivity = leadItems.slice(0, 8).map((lead) => {
    const overdue = lead.nextFollowUpDate && startOfDay(lead.nextFollowUpDate) < today;
    return {
      id: lead._id,
      title: lead.customerName,
      subtitle: `${lead.leadId} · ${(lead.status || "PENDING").replace(/_/g, " ")}`,
      meta: lead.createdAt
        ? new Date(lead.createdAt).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "",
      href: `/dashboard/leads/${lead._id}`,
      tone: lead.status === "LOST" || overdue ? "danger" : lead.status === "CONFIRMED" ? "success" : "default",
    };
  });

  const upcomingFollowUps = leadItems
    .filter((l) => l.nextFollowUpDate)
    .sort((a, b) => new Date(a.nextFollowUpDate) - new Date(b.nextFollowUpDate))
    .slice(0, 6)
    .map((lead) => ({
      id: lead._id,
      title: lead.customerName,
      subtitle: lead.leadId,
      date: new Date(lead.nextFollowUpDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      overdue: startOfDay(lead.nextFollowUpDate) < today,
      href: `/dashboard/leads/${lead._id}`,
    }));

  return {
    totals: {
      leads: leadsPage.total,
      vendors: vendorsPage.total,
      vendorsPending: vendorsPending.total,
      vendorsVerified: vendorsVerified.total,
      drivers: driversPage.total,
      driversActive: driversActive.total,
      vehicles: vehiclesPage.total,
      vehiclesActive: vehiclesActive.total,
      overdueFollowUps,
    },
    leadsThisWeek: leadWeek.current,
    leadChange: leadWeek.change,
    vendorChange: vendorWeek.change,
    driverChange: driverWeek.change,
    vehicleChange: vehicleWeek.change,
    confirmedChange: confirmedWeek.change,
    followUpChange: followUpWeek.change,
    statusCounts,
    sourceBreakdown: Object.entries(sourceMap).map(([name, value]) => ({ name, value })),
    leadTrend: buildSparkline(leadItems, 7),
    vendorTrend: buildSparkline(vendorsRecent.data, 7),
    driverTrend: buildSparkline(driversRecent.data, 7),
    vehicleTrend: buildSparkline(vehiclesRecent.data, 7),
    confirmedTrend: buildSparkline(confirmedLeads, 7),
    followUpTrend: buildSparkline(followUpEvents, 7),
    pendingVendorTrend: buildSparkline(pendingVendors, 7),
    pipelineTrend: buildSparkline(pipelineLeads, 7),
    recentActivity,
    upcomingFollowUps,
  };
}

export async function fetchVendorDashboard() {
  const [drivers, driversActive, vehicles, vehiclesActive, driverSample, vehicleSample] =
    await Promise.all([
      safeList(driverService.list, { page: 1, limit: 1 }),
      safeList(driverService.list, { page: 1, limit: 1, status: "ACTIVE" }),
      safeList(vehicleService.list, { page: 1, limit: 1 }),
      safeList(vehicleService.list, { page: 1, limit: 1, status: "ACTIVE" }),
      safeList(driverService.list, { page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" }),
      safeList(vehicleService.list, { page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" }),
    ]);

  const driverWeek = weekChange(driverSample.data);
  const vehicleWeek = weekChange(vehicleSample.data);

  return {
    totals: {
      drivers: drivers.total,
      driversActive: driversActive.total,
      vehicles: vehicles.total,
      vehiclesActive: vehiclesActive.total,
    },
    driverTrend: buildSparkline(driverSample.data, 7),
    vehicleTrend: buildSparkline(vehicleSample.data, 7),
    driverChange: driverWeek.change,
    vehicleChange: vehicleWeek.change,
    recentDrivers: driverSample.data.slice(0, 5),
    recentVehicles: vehicleSample.data.slice(0, 5),
  };
}
