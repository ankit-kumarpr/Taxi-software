import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Bus,
  CalendarClock,
  Car,
  ClipboardList,
  Gauge,
  Mail,
  MapPinned,
  Phone,
  Radio,
  Store,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { cn } from "../utils/cn";
import { KpiCard } from "../components/dashboard/KpiCard";
import { ChartCard } from "../components/dashboard/ChartCard";
import { TaxiHero } from "../components/dashboard/TaxiHero";
import { FleetStrip } from "../components/dashboard/FleetStrip";
import { fetchAdminDashboard, fetchVendorDashboard } from "../services/dashboardService";
import { leadStatusLabel, leadSourceLabel } from "../services/leadService";

const BLUE = "#7C3AED";
const RED = "#E5484D";
const TAXI_YELLOW = "#E9A23B";
const MUTED = "#667085";
const PIE_COLORS = [BLUE, RED, "#8B5CF6", "#F87171", TAXI_YELLOW, "#6D28D9"];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const todayLabel = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

function EmptyChart({ message = "No trips data yet" }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background text-center">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-primary">
        <MapPinned className="h-4 w-4" />
      </div>
      <p className="text-[13px] text-muted">{message}</p>
    </div>
  );
}

function AdminDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchAdminDashboard();
      if (alive) {
        setStats(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const statusChart = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.statusCounts)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({ name: leadStatusLabel(key), value, key }));
  }, [stats]);

  const sourceChart = useMemo(() => {
    if (!stats) return [];
    return stats.sourceBreakdown.map((row) => ({
      name: leadSourceLabel(row.name),
      value: row.value,
    }));
  }, [stats]);

  const trendChart = stats?.leadTrend || [];

  return (
    <div className="space-y-4">
      <TaxiHero
        title={`${greeting()}, ${user?.name || "Admin"}`}
        subtitle="Fleet, vendors and lead pipeline — live CRM data."
        badge={todayLabel()}
        meta="Operations · India"
      />

      <FleetStrip
        loading={loading}
        items={[
          {
            label: "On the road",
            value: `${stats?.totals.vehiclesActive ?? 0} active cabs`,
            icon: Car,
            to: "/dashboard/vehicles",
            tone: "yellow",
          },
          {
            label: "Drivers ready",
            value: `${stats?.totals.driversActive ?? 0} active`,
            icon: Users,
            to: "/dashboard/drivers",
            tone: "blue",
          },
          {
            label: "Open leads",
            value: `${stats?.totals.leads ?? 0} in pipeline`,
            icon: ClipboardList,
            to: "/dashboard/leads",
            tone: "red",
          },
          {
            label: "Follow-ups due",
            value: `${stats?.totals.overdueFollowUps ?? 0} overdue`,
            icon: Radio,
            to: "/dashboard/leads",
            tone: "red",
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Leads"
          value={stats?.totals.leads}
          hint={`${stats?.leadsThisWeek ?? 0} booked this week`}
          icon={ClipboardList}
          to="/dashboard/leads"
          change={stats?.leadChange}
          sparkData={stats?.leadTrend}
          accent="blue"
          loading={loading}
        />
        <KpiCard
          title="Vendors"
          value={stats?.totals.vendors}
          hint={`${stats?.totals.vendorsVerified ?? 0} verified · ${stats?.totals.vendorsPending ?? 0} pending`}
          icon={Store}
          to="/dashboard/vendors"
          change={stats?.vendorChange}
          sparkData={stats?.vendorTrend}
          accent="red"
          loading={loading}
        />
        <KpiCard
          title="Active Drivers"
          value={stats?.totals.driversActive}
          hint={`${stats?.totals.drivers ?? 0} total in fleet`}
          icon={Users}
          to="/dashboard/drivers"
          change={stats?.driverChange}
          sparkData={stats?.driverTrend}
          accent="mixed"
          loading={loading}
        />
        <KpiCard
          title="Overdue Follow-ups"
          value={stats?.totals.overdueFollowUps}
          hint="Needs dispatch attention"
          icon={CalendarClock}
          to="/dashboard/leads"
          change={stats?.followUpChange}
          sparkData={stats?.followUpTrend}
          accent="red"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Fleet Vehicles"
          value={stats?.totals.vehicles}
          hint={`${stats?.totals.vehiclesActive ?? 0} on duty`}
          icon={Bus}
          to="/dashboard/vehicles"
          change={stats?.vehicleChange}
          sparkData={stats?.vehicleTrend}
          accent="blue"
          loading={loading}
        />
        <KpiCard
          title="Pending Vendor Verify"
          value={stats?.totals.vendorsPending}
          hint="Needs admin review"
          icon={BadgeCheck}
          to="/dashboard/vendors"
          sparkData={stats?.pendingVendorTrend}
          accent="red"
          loading={loading}
        />
        <KpiCard
          title="Confirmed Trips"
          value={stats?.statusCounts?.CONFIRMED ?? 0}
          hint="Confirmed leads"
          icon={Gauge}
          to="/dashboard/leads"
          change={stats?.confirmedChange}
          sparkData={stats?.confirmedTrend}
          accent="mixed"
          loading={loading}
        />
        <KpiCard
          title="Follow-up Pipeline"
          value={(stats?.statusCounts?.FOLLOW_UP || 0) + (stats?.statusCounts?.PENDING || 0)}
          hint="Pending + follow-up"
          icon={Phone}
          to="/dashboard/leads"
          sparkData={stats?.pipelineTrend}
          accent="red"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          tone="mixed"
          title="Lead intake — last 7 days"
          subtitle="Daily booking requests hitting the desk"
        >
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          ) : trendChart.some((p) => p.value > 0) ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChart} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="leadArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={RED} stopOpacity={0.45} />
                      <stop offset="45%" stopColor={TAXI_YELLOW} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #E5EAF2",
                      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Leads"
                    stroke={RED}
                    strokeWidth={2.5}
                    fill="url(#leadArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No lead activity in the last 7 days yet." />
          )}
        </ChartCard>

        <ChartCard tone="red" title="Lead status mix" subtitle="Where each booking stands">
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
          ) : statusChart.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {statusChart.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={
                          entry.key === "LOST" || entry.key === "PAYMENT_PENDING"
                            ? RED
                            : PIE_COLORS[index % PIE_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard tone="blue" title="Lead sources" subtitle="Where trip requests are coming from">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : sourceChart.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Leads" radius={[8, 8, 0, 0]}>
                    {sourceChart.map((_, index) => (
                      <Cell
                        key={`src-${index}`}
                        fill={index % 3 === 0 ? BLUE : index % 3 === 1 ? RED : TAXI_YELLOW}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart />
          )}
        </ChartCard>

        <ChartCard
          tone="red"
          title="Upcoming follow-ups"
          subtitle="Next customer callbacks on the desk"
          action={
            <Link to="/dashboard/leads" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          }
        >
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : stats?.upcomingFollowUps?.length ? (
            <ul className="space-y-2">
              {stats.upcomingFollowUps.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition hover:border-primary/30",
                      item.overdue ? "border-red-200 bg-red-50/60" : "border-border bg-slate-50/60"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-navy">{item.title}</p>
                      <p className="text-xs text-muted">{item.subtitle}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={cn("text-xs font-semibold", item.overdue ? "text-accent" : "text-primary")}>
                        {item.date}
                      </p>
                      {item.overdue ? (
                        <p className="text-[10px] font-medium uppercase text-accent">Overdue</p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyChart message="No follow-ups scheduled yet." />
          )}
        </ChartCard>
      </div>

      <ChartCard tone="mixed" title="Recent lead activity" subtitle="Latest movement across the pipeline">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
        ) : stats?.recentActivity?.length ? (
          <ul className="divide-y divide-border">
            {stats.recentActivity.map((item) => (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="flex items-center justify-between gap-4 py-3 transition hover:bg-slate-50/80"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 shrink-0 rounded-full",
                        item.tone === "danger" && "bg-accent",
                        item.tone === "success" && "bg-emerald-500",
                        item.tone === "default" && "bg-primary"
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy">{item.title}</p>
                      <p className="truncate text-xs text-muted">{item.subtitle}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted">{item.meta}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyChart message="Create your first lead to see activity here." />
        )}
      </ChartCard>
    </div>
  );
}

function VendorDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await fetchVendorDashboard();
      if (alive) {
        setStats(data);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <TaxiHero
        title={`${greeting()}, ${user?.name || user?.companyName || "Vendor"}`}
        subtitle={`Vendor ${user?.vendorId || "—"} · Keep your cabs and drivers ready for trips.`}
        badge={todayLabel()}
        meta={user?.companyName || "Your fleet desk"}
      />

      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Verified vendor — ready to operate</p>
            <p className="mt-0.5 text-sm text-emerald-800">
              {user?.email || "—"} · {user?.phone || user?.mobileNumber || "—"}
            </p>
          </div>
        </div>
      </div>

      <FleetStrip
        loading={loading}
        items={[
          {
            label: "Your cabs",
            value: `${stats?.totals.vehiclesActive ?? 0} active`,
            icon: Car,
            to: "/dashboard/vehicles",
            tone: "yellow",
          },
          {
            label: "Your drivers",
            value: `${stats?.totals.driversActive ?? 0} active`,
            icon: Users,
            to: "/dashboard/drivers",
            tone: "blue",
          },
          {
            label: "Fleet size",
            value: `${stats?.totals.vehicles ?? 0} vehicles`,
            icon: Bus,
            to: "/dashboard/vehicles",
            tone: "red",
          },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Drivers"
          value={stats?.totals.drivers}
          hint={`${stats?.totals.driversActive ?? 0} active`}
          icon={Car}
          to="/dashboard/drivers"
          change={stats?.driverChange}
          sparkData={stats?.driverTrend}
          accent="blue"
          loading={loading}
        />
        <KpiCard
          title="Vehicles"
          value={stats?.totals.vehicles}
          hint={`${stats?.totals.vehiclesActive ?? 0} on duty`}
          icon={Bus}
          to="/dashboard/vehicles"
          change={stats?.vehicleChange}
          sparkData={stats?.vehicleTrend}
          accent="red"
          loading={loading}
        />
        <KpiCard
          title="Active Drivers"
          value={stats?.totals.driversActive}
          hint="Ready for trips"
          icon={Users}
          to="/dashboard/drivers"
          sparkData={stats?.driverTrend}
          accent="mixed"
          loading={loading}
        />
        <KpiCard
          title="Active Vehicles"
          value={stats?.totals.vehiclesActive}
          hint="On the road"
          icon={Bus}
          to="/dashboard/vehicles"
          sparkData={stats?.vehicleTrend}
          accent="red"
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard tone="red" title="Driver registrations — 7 days" subtitle="New drivers joining your fleet">
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
          ) : stats?.driverTrend?.some((p) => p.value > 0) ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.driverTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF2" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" name="Drivers" stroke={RED} fill={`${RED}33`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="No new drivers in the last week." />
          )}
        </ChartCard>

        <ChartCard tone="mixed" title="Fleet desk" subtitle="Jump into your taxi ops">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: "/dashboard/drivers", title: "Drivers", text: "Register & assign", icon: Car, tone: "blue" },
              { to: "/dashboard/vehicles", title: "Cabs", text: "Vehicles & docs", icon: Bus, tone: "yellow" },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-xl border border-border bg-slate-50/80 p-4 transition hover:border-primary/30 hover:bg-white"
              >
                <div
                  className={cn(
                    "mb-2 flex h-9 w-9 items-center justify-center rounded-lg text-white",
                    item.tone === "yellow" && "bg-[#F5C518] text-navy",
                    item.tone === "blue" && "bg-primary",
                    item.tone === "red" && "bg-accent"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="font-semibold text-navy">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted">{item.text}</p>
              </Link>
            ))}
          </div>
          <dl className="mt-5 grid gap-3 rounded-xl border border-border bg-white p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Company</dt>
              <dd className="mt-1 font-medium text-navy">{user?.companyName || user?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Type</dt>
              <dd className="mt-1 font-medium text-navy">{user?.vendorType?.name || "—"}</dd>
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Mail className="h-4 w-4 text-muted" />
              <span className="font-medium text-navy">{user?.email || "—"}</span>
            </div>
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}

function DriverDashboard({ user }) {
  return (
    <div className="space-y-4">
      <TaxiHero
        title={`${greeting()}, ${user?.name || "Driver"}`}
        subtitle="Start trips with pickup code, see amounts, collect balance on Razorpay."
        badge={todayLabel()}
        meta={user?.assignedVendor?.companyName || "Assigned fleet"}
      />

      <div className="rounded-2xl border border-teal-200 bg-teal-50/60 px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Assigned trips</p>
            <h2 className="mt-1 text-lg font-semibold text-navy">Open your trip panel</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              View totals and pending amount. Fully paid trips complete instantly; otherwise only
              Razorpay is allowed at drop.
            </p>
          </div>
          <Link to="/dashboard/my-trips">
            <Button>
              My Trips
              <MapPinned className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-blue-50 via-white to-red-50 px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-primary">Grow your business</p>
            <h2 className="mt-1 text-lg font-semibold text-navy">Ready to become a vendor?</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Upgrade to manage your own fleet and drivers. Your current driver login will stop after
              you convert.
            </p>
          </div>
          <Link to="/dashboard/become-vendor">
            <Button>
              Become Vendor
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #F5C518 0 12px, #0F172A 12px 24px)",
            }}
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Driver ID</p>
          <p className="mt-2 font-mono text-2xl font-bold text-primary">{user?.driverId || "—"}</p>
          <p className="mt-2 text-sm text-muted">
            Status:{" "}
            <span className={cn("font-semibold", user?.status === "ACTIVE" ? "text-emerald-600" : "text-accent")}>
              {user?.status || "ACTIVE"}
            </span>
          </p>
          {user?.assignedVendor?.companyName ? (
            <p className="mt-1 text-sm text-muted">Vendor: {user.assignedVendor.companyName}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Contact</p>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted" />
              <span className="font-medium text-navy">{user?.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted" />
              <span className="font-medium text-navy">{user?.phone || user?.mobileNumber || "—"}</span>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();

  if (user?.userType === "VENDOR") {
    return <VendorDashboard user={user} />;
  }

  if (user?.userType === "DRIVER") {
    return <DriverDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}
