import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Ban, CheckCircle2, Search, Shield, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";
import { getFunctionErrorMessage } from "@/utils/functionErrors";

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "individual", label: "Individual" },
  { value: "garage", label: "Garage" },
  { value: "dealer", label: "Dealer" },
];

const ROLE_OPTIONS = [
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "dealer", label: "Dealer" },
  { value: "inspector", label: "Inspector" },
  { value: "admin", label: "Admin" },
];

const getRole = (user) => (user.role === "user" ? "buyer" : user.role || "buyer");
const getPlan = (user) =>
  String(user.subscription_plan || user.subscription?.plan || user.plan || "free").toLowerCase();
const getStatus = (user) => {
  const plan = getPlan(user);
  const status = String(user.subscription_status || user.subscription?.status || "").toLowerCase();
  if (plan === "free" || plan === "individual") return "active";
  return status || "missing";
};

const planColors = {
  free: "bg-slate-100 text-slate-700",
  individual: "bg-cyan-100 text-cyan-700",
  garage: "bg-amber-100 text-amber-800",
  dealer: "bg-blue-100 text-blue-700",
};

const statusColors = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  missing: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-600",
};

const roleColors = {
  admin: "bg-purple-100 text-purple-700",
  dealer: "bg-blue-100 text-blue-700",
  seller: "bg-emerald-100 text-emerald-700",
  inspector: "bg-amber-100 text-amber-800",
  buyer: "bg-gray-100 text-gray-700",
};

export default function AdminUsers({ users = [], onRefresh }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyUserId, setBusyUserId] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const visibleUsers = useMemo(() => users.filter((user) => !user.deleted_at), [users]);

  const filtered = visibleUsers.filter((user) => {
    const role = getRole(user);
    const plan = getPlan(user);
    const status = getStatus(user);

    if (roleFilter !== "all" && role !== roleFilter) return false;
    if (planFilter !== "all" && plan !== planFilter) return false;
    if (statusFilter !== "all" && status !== statusFilter) return false;

    if (!search) return true;

    const term = search.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term)
    );
  });

  const quickStats = [
    { label: "Total", value: visibleUsers.length, icon: UserCog },
    { label: "Active", value: visibleUsers.filter((user) => !user.is_banned).length, icon: CheckCircle2 },
    { label: "Banned", value: visibleUsers.filter((user) => user.is_banned).length, icon: Ban },
    { label: "Admins", value: visibleUsers.filter((user) => getRole(user) === "admin").length, icon: Shield },
  ];

  const runAdminAction = async ({ action, userId, value, successMessage }) => {
    setBusyUserId(userId);

    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action, userId, value },
    });

    setBusyUserId("");

    if (error) {
      toast.error(await getFunctionErrorMessage(error, "Admin action failed"));
      return false;
    }

    if (data?.error) {
      toast.error(data.error);
      return false;
    }

    if (data?.warning) {
      toast.warning(data.warning);
    } else {
      toast.success(successMessage);
    }

    onRefresh?.();
    return true;
  };

  const handleRoleChange = async (userId, newRole) => {
    await runAdminAction({
      action: "update_role",
      userId,
      value: newRole,
      successMessage: "Role updated",
    });
  };

  const handlePlanChange = async (userId, newPlan) => {
    await runAdminAction({
      action: "update_plan",
      userId,
      value: newPlan,
      successMessage: "Plan updated",
    });
  };

  const toggleBan = async (user) => {
    await runAdminAction({
      action: "toggle_ban",
      userId: user.id,
      value: !user.is_banned,
      successMessage: user.is_banned ? "User unbanned" : "User banned",
    });
  };

  const deleteUser = async () => {
    if (!pendingDelete) return;

    const deleted = await runAdminAction({
      action: "delete_user",
      userId: pendingDelete.id,
      successMessage: "User deleted",
    });

    if (deleted) setPendingDelete(null);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-slate-600">
              <stat.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{stat.label}</span>
            </div>
            <p className="text-xl font-bold text-slate-950">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_150px_150px_160px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 rounded-xl pl-10"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            {PLAN_OPTIONS.map((plan) => (
              <SelectItem key={plan.value} value={plan.value}>{plan.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 rounded-xl">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trialing">Trialing</SelectItem>
            <SelectItem value="past_due">Past due</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} users found</p>
        <p className="text-xs text-muted-foreground">Role, plan, ban, and delete actions update live data.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 text-left text-xs font-semibold text-slate-500">User</th>
              <th className="p-4 text-left text-xs font-semibold text-slate-500">Role</th>
              <th className="p-4 text-left text-xs font-semibold text-slate-500">Plan</th>
              <th className="p-4 text-left text-xs font-semibold text-slate-500">Billing</th>
              <th className="p-4 text-left text-xs font-semibold text-slate-500">Joined</th>
              <th className="p-4 text-right text-xs font-semibold text-slate-500">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}

            {filtered.map((user) => {
              const role = getRole(user);
              const plan = getPlan(user);
              const status = getStatus(user);
              const busy = busyUserId === user.id;

              return (
                <tr key={user.id} className="border-t transition hover:bg-slate-50/80">
                  <td className="max-w-[300px] p-4">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-950">
                        {user.full_name || "No name"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{user.email || "Email not added"}</p>
                      <p className="truncate text-xs text-slate-500">{user.phone || "Phone not added"}</p>
                    </div>
                  </td>

                  <td className="p-4">
                    <Select
                      value={role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={busy}
                    >
                      <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge className={`mt-2 rounded-full px-2 py-1 text-xs ${roleColors[role] || roleColors.buyer}`}>
                      {role}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <Select
                      value={plan}
                      onValueChange={(value) => handlePlanChange(user.id, value)}
                      disabled={busy}
                    >
                      <SelectTrigger className="h-9 w-32 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge className={`mt-2 rounded-full px-2 py-1 text-xs ${planColors[plan] || planColors.free}`}>
                      {plan}
                    </Badge>
                  </td>

                  <td className="p-4">
                    <Badge className={`rounded-full px-2 py-1 text-xs ${statusColors[status] || statusColors.missing}`}>
                      {status.replace("_", " ")}
                    </Badge>
                    <p className="mt-2 text-xs text-slate-500">
                      {user.current_period_end
                        ? `Renews ${moment(user.current_period_end).format("MMM D, YYYY")}`
                        : "No renewal date"}
                    </p>
                  </td>

                  <td className="p-4 text-xs text-slate-500">
                    {user.created_at ? moment(user.created_at).format("MMM D, YYYY") : "-"}
                    <br />
                    {user.created_at ? moment(user.created_at).format("h:mm A") : ""}
                  </td>

                  <td className="p-4">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge
                        className={`rounded-full px-2 py-1 text-xs ${
                          user.is_banned ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {user.is_banned ? "Banned" : "Allowed"}
                      </Badge>

                      <Button
                        size="sm"
                        variant={user.is_banned ? "secondary" : "outline"}
                        className={`h-8 px-3 text-xs ${
                          user.is_banned
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                        onClick={() => toggleBan(user)}
                        disabled={busy}
                      >
                        {user.is_banned ? "Unban" : "Ban"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 px-3 text-xs"
                        onClick={() => setPendingDelete(user)}
                        disabled={busy}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will block the profile first and then try to delete the auth user. Related marketplace records may keep the profile as blocked instead of fully removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={deleteUser}
              disabled={busyUserId === pendingDelete?.id}
            >
              Delete user
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
