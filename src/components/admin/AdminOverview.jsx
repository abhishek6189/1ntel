import { useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  CalendarClock,
  Car,
  CheckCircle2,
  Clock3,
  DollarSign,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  UserPlus,
  Users,
} from "lucide-react";
import moment from "moment";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { downloadUsersExcel, downloadUsersPdf } from "@/utils/adminExport";

const PLAN_CONFIG = {
  free: { label: "Free", monthly: 0, color: "border-slate-200 bg-slate-50 text-slate-700" },
  individual: { label: "Individual", monthly: 29, color: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  garage: { label: "Garage", monthly: 79, color: "border-amber-200 bg-amber-50 text-amber-800" },
  dealer: { label: "Dealer", monthly: 249, color: "border-blue-200 bg-blue-50 text-blue-800" },
};

const PAID_RECURRING_PLANS = new Set(["garage", "dealer"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const RENEWAL_NOTICE_DAYS = 7;

const formatMoney = (value) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDateTime = (value) => (value ? moment(value).format("MMM D, YYYY h:mm A") : "-");

const getRole = (user) => (user.role === "user" ? "buyer" : user.role || "buyer");

const getSubscriptionStatus = (user) => {
  const plan = String(user.subscription_plan || user.subscription?.plan || user.plan || "free").toLowerCase();
  const status = String(user.subscription_status || user.subscription?.status || "").toLowerCase();

  if (!PAID_RECURRING_PLANS.has(plan)) return "active";
  return status || "missing";
};

const getUserPlan = (user) => {
  const subscriptionPlan = String(user.subscription_plan || user.subscription?.plan || "").toLowerCase();
  const profilePlan = String(user.plan || "").toLowerCase();

  if (subscriptionPlan && PLAN_CONFIG[subscriptionPlan]) return subscriptionPlan;
  if (PLAN_CONFIG[profilePlan]) return profilePlan;
  return "free";
};

const isRenewalSoon = (user) => {
  const plan = getUserPlan(user);
  const status = getSubscriptionStatus(user);
  const periodEnd = user.current_period_end || user.subscription?.current_period_end;
  if (!PAID_RECURRING_PLANS.has(plan) || !ACTIVE_STATUSES.has(status) || !periodEnd) return false;

  const days = moment(periodEnd).diff(moment(), "days");
  return days >= 0 && days <= RENEWAL_NOTICE_DAYS;
};

export default function AdminOverview({ stats }) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [userSection, setUserSection] = useState(null);
  const { cars = [], users = [], inspections = [], listingCreditPayments = [] } = stats;

  const metrics = useMemo(() => {
    const visibleUsers = users.filter((user) => !user.deleted_at);
    const recentJoiners = [...visibleUsers]
      .filter((user) => user.created_at)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 12);
    const joinedToday = visibleUsers.filter((user) =>
      user.created_at ? moment(user.created_at).isAfter(moment().subtract(24, "hours")) : false
    );

    const planGroups = Object.keys(PLAN_CONFIG).reduce((acc, plan) => {
      acc[plan] = { users: [], active: [], due: [], renewalSoon: [], revenue: 0 };
      return acc;
    }, {});

    for (const user of visibleUsers) {
      const plan = getUserPlan(user);
      const status = getSubscriptionStatus(user);
      const group = planGroups[plan] || planGroups.free;

      group.users.push(user);

      if (status === "past_due" || status === "missing") {
        group.due.push(user);
      } else {
        group.active.push(user);
      }

      if (isRenewalSoon(user)) {
        group.renewalSoon.push(user);
      }
    }

    for (const plan of Object.keys(planGroups)) {
      if (PAID_RECURRING_PLANS.has(plan)) {
        planGroups[plan].revenue = planGroups[plan].active.filter((user) => {
          const status = getSubscriptionStatus(user);
          return status === "active";
        }).length * PLAN_CONFIG[plan].monthly;
      }
    }

    const individualCredits = listingCreditPayments.reduce(
      (sum, payment) => sum + Number(payment.credits || 1),
      0
    );
    planGroups.individual.revenue = individualCredits * PLAN_CONFIG.individual.monthly;

    const activeSubscriptions = visibleUsers.filter((user) => {
      const plan = getUserPlan(user);
      const status = getSubscriptionStatus(user);
      return PAID_RECURRING_PLANS.has(plan) && ACTIVE_STATUSES.has(status);
    });
    const dueSubscriptions = visibleUsers.filter((user) => {
      const plan = getUserPlan(user);
      const status = getSubscriptionStatus(user);
      return PAID_RECURRING_PLANS.has(plan) && ["past_due", "missing"].includes(status);
    });
    const renewalSoonUsers = visibleUsers.filter(isRenewalSoon);

    const recurringRevenue = Object.keys(planGroups).reduce(
      (sum, plan) => sum + (PAID_RECURRING_PLANS.has(plan) ? planGroups[plan].revenue : 0),
      0
    );

    return {
      visibleUsers,
      recentJoiners,
      joinedToday,
      planGroups,
      activeSubscriptions,
      dueSubscriptions,
      renewalSoonUsers,
      recurringRevenue,
      individualRevenue: planGroups.individual.revenue,
      totalRevenue: recurringRevenue + planGroups.individual.revenue,
      activeCars: cars.filter((car) => car.status === "active").length,
      pendingInspections: inspections.filter((inspection) => inspection.status === "pending").length,
    };
  }, [cars, inspections, listingCreditPayments, users]);

  const openUserSection = (title, sectionUsers) => {
    setUserSection({ title, users: sectionUsers || [] });
  };

  const topStats = [
    { label: "Total users", value: metrics.visibleUsers.length, icon: Users, tone: "bg-blue-50 text-blue-700", users: metrics.visibleUsers },
    { label: "New in 24h", value: metrics.joinedToday.length, icon: UserPlus, tone: "bg-emerald-50 text-emerald-700", users: metrics.joinedToday },
    { label: "Active paid", value: metrics.activeSubscriptions.length, icon: CheckCircle2, tone: "bg-green-50 text-green-700", users: metrics.activeSubscriptions },
    { label: "Due / missing", value: metrics.dueSubscriptions.length, icon: ShieldAlert, tone: "bg-red-50 text-red-700", users: metrics.dueSubscriptions },
    { label: "Renewal soon", value: metrics.renewalSoonUsers.length, icon: CalendarClock, tone: "bg-amber-50 text-amber-800", users: metrics.renewalSoonUsers },
    { label: "Total revenue", value: formatMoney(metrics.totalRevenue), icon: DollarSign, tone: "bg-violet-50 text-violet-700", users: metrics.visibleUsers },
  ];

  return (
    <div className="space-y-6">
      {metrics.joinedToday.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Bell className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">New joining activity</p>
                <p className="mt-1">
                  {metrics.joinedToday.length} user{metrics.joinedToday.length === 1 ? "" : "s"} joined in the last 24 hours.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full border-emerald-300 bg-white/70 text-emerald-800 sm:w-auto"
              onClick={() => setJoinDialogOpen(true)}
            >
              View activity
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {topStats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
            onClick={() => openUserSection(stat.label, stat.users)}
          >
            <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}>
              <stat.icon className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-slate-950">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatusPanel
          title="Active subscriptions"
          icon={CheckCircle2}
          users={metrics.activeSubscriptions}
          tone="border-green-200 bg-green-50 text-green-800"
          onOpen={() => openUserSection("Active subscriptions", metrics.activeSubscriptions)}
        />
        <StatusPanel
          title="Due plans"
          icon={AlertCircle}
          users={metrics.dueSubscriptions}
          tone="border-red-200 bg-red-50 text-red-800"
          onOpen={() => openUserSection("Due plans", metrics.dueSubscriptions)}
        />
        <StatusPanel
          title="Renewal soon"
          icon={Clock3}
          users={metrics.renewalSoonUsers}
          tone="border-amber-200 bg-amber-50 text-amber-800"
          onOpen={() => openUserSection("Renewal soon", metrics.renewalSoonUsers)}
        />
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Plan sections</h2>
            <p className="text-sm text-slate-500">Users, renewal status, and revenue by plan.</p>
          </div>
          <Badge className="w-fit bg-slate-100 text-slate-700">
            MRR {formatMoney(metrics.recurringRevenue)} + credits {formatMoney(metrics.individualRevenue)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {Object.entries(PLAN_CONFIG).map(([plan, config]) => {
            const group = metrics.planGroups[plan];
            return (
              <button
                key={plan}
                type="button"
                className="rounded-xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                onClick={() => openUserSection(`${config.label} plan users`, group.users)}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <Badge className={`${config.color} border font-semibold`}>
                      {config.label}
                    </Badge>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{group.users.length}</p>
                    <p className="text-xs text-slate-500">total users</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">{formatMoney(group.revenue)}</p>
                    <p className="text-xs text-slate-500">{plan === "individual" ? "credit revenue" : "monthly revenue"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <MetricPill label="Active" value={group.active.length} />
                  <MetricPill label="Due" value={group.due.length} danger />
                  <MetricPill label="Soon" value={group.renewalSoon.length} warning />
                </div>

                <div className="mt-4 space-y-2">
                  {group.users.slice(0, 3).map((user) => (
                    <UserLine key={user.id} user={user} />
                  ))}
                  {group.users.length === 0 && (
                    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">No users in this plan.</p>
                  )}
                  {group.users.length > 3 && (
                    <p className="text-xs text-slate-500">+{group.users.length - 3} more users</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Car className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-950">Listings health</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetricPill label="Total" value={cars.length} />
            <MetricPill label="Active" value={metrics.activeCars} />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-950">Inspections</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetricPill label="Total" value={inspections.length} />
            <MetricPill label="Pending" value={metrics.pendingInspections} warning />
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-950">Revenue split</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <MetricPill label="Recurring" value={formatMoney(metrics.recurringRevenue)} />
            <MetricPill label="Credits" value={formatMoney(metrics.individualRevenue)} />
          </div>
        </div>
      </div>

      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-[94vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>New joining activity</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-2 overflow-y-auto pr-1">
            {metrics.recentJoiners.map((user) => (
              <div key={user.id} className="rounded-xl border bg-white p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {user.full_name || user.email || "Unnamed user"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email || user.phone || "No contact"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{getRole(user)}</Badge>
                    <Badge variant="outline">{getUserPlan(user)}</Badge>
                    <span className="text-xs text-slate-500">{formatDateTime(user.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
            {metrics.recentJoiners.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">No joining activity yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userSection} onOpenChange={(open) => !open && setUserSection(null)}>
        <DialogContent className="max-h-[88vh] max-w-[96vw] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{userSection?.title || "Users"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {userSection?.users?.length || 0} user{userSection?.users?.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadUsersExcel(userSection?.title || "Users", userSection?.users || [])}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadUsersPdf(userSection?.title || "Users", userSection?.users || [])}
              >
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-auto rounded-xl border">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">User</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Phone</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Role</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Plan</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Billing</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Joined</th>
                  <th className="p-3 text-left text-xs font-semibold text-slate-500">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {(userSection?.users || []).map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="max-w-[260px] p-3">
                      <p className="truncate font-semibold text-slate-950">{user.full_name || "No name"}</p>
                      <p className="truncate text-xs text-slate-500">{user.email || "No email"}</p>
                    </td>
                    <td className="p-3 text-slate-600">{user.phone || "-"}</td>
                    <td className="p-3 text-slate-600">{getRole(user)}</td>
                    <td className="p-3 text-slate-600">{getUserPlan(user)}</td>
                    <td className="p-3 text-slate-600">{getSubscriptionStatus(user)}</td>
                    <td className="p-3 text-slate-600">{formatDateTime(user.created_at)}</td>
                    <td className="p-3 text-slate-600">
                      {formatDateTime(user.current_period_end || user.subscription?.current_period_end)}
                    </td>
                  </tr>
                ))}
                {(!userSection?.users || userSection.users.length === 0) && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No users in this section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const StatusPanel = ({ title, icon: Icon, users, tone, onOpen }) => (
  <button
    type="button"
    className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${tone}`}
    onClick={onOpen}
  >
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <span className="text-lg font-bold">{users.length}</span>
    </div>
    <div className="space-y-2">
      {users.slice(0, 4).map((user) => (
        <UserLine key={user.id} user={user} />
      ))}
      {users.length === 0 && <p className="text-xs opacity-80">No users in this section.</p>}
      {users.length > 4 && <p className="text-xs opacity-80">+{users.length - 4} more</p>}
    </div>
  </button>
);

const MetricPill = ({ label, value, danger = false, warning = false }) => (
  <div
    className={`rounded-lg border px-3 py-2 ${
      danger
        ? "border-red-200 bg-red-50 text-red-700"
        : warning
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-700"
    }`}
  >
    <p className="text-base font-bold">{value}</p>
    <p className="text-[11px] leading-4 opacity-80">{label}</p>
  </div>
);

const UserLine = ({ user }) => (
  <div className="min-w-0 rounded-lg bg-white/70 p-2 text-xs">
    <p className="truncate font-semibold text-slate-900">{user.full_name || user.email || "Unnamed user"}</p>
    <p className="truncate text-slate-500">
      {getRole(user)} - {getUserPlan(user)} - {getSubscriptionStatus(user)}
    </p>
  </div>
);
