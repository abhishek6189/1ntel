import { useState } from "react";
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
import { Search } from "lucide-react";
import { toast } from "sonner";
import moment from "moment";

export default function AdminUsers({ users = [], onRefresh }) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busyUserId, setBusyUserId] = useState("");

  const getRole = (user) =>
    user.role === "user" ? "buyer" : user.role || "buyer";

  const filtered = users.filter((user) => {
    if (user.deleted_at) return false;

    const role = getRole(user);

    if (roleFilter !== "all" && role !== roleFilter) return false;

    if (!search) return true;

    const term = search.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term)
    );
  });

  const runAdminAction = async ({ action, userId, value, successMessage }) => {
    setBusyUserId(userId);

    const { data, error } = await supabase.functions.invoke("admin-user-actions", {
      body: { action, userId, value },
    });

    setBusyUserId("");

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Admin action failed");
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

  const deleteUser = async (userId) => {
    if (!confirm("Delete this user permanently?")) return;

    await runAdminAction({
      action: "delete_user",
      userId,
      successMessage: "User deleted",
    });
  };

  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    dealer: "bg-blue-100 text-blue-700",
    buyer: "bg-gray-100 text-gray-700",
  };

  return (
    <div>
      <div className="flex flex-col gap-3 mb-6 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-10 w-full rounded-xl sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="buyer">Users</SelectItem>
            <SelectItem value="dealer">Dealers</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        {filtered.length} users found
      </p>

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">User</th>
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">Role</th>
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">Plan</th>
              <th className="p-4 text-left text-xs font-medium text-muted-foreground">Joined</th>
              <th className="p-4 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}

            {filtered.map((user) => {
              const role = getRole(user);

              return (
                <tr key={user.id} className="border-t transition-all hover:bg-gray-50">
                  <td className="p-4 max-w-[260px]">
                    <p className="truncate font-medium text-foreground">
                      {user.full_name || "No name"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email || "Email not added"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.phone || "Phone not added"}
                    </p>
                  </td>

                  <td className="p-4">
                    <Select
                      value={role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                      disabled={busyUserId === user.id}
                    >
                      <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buyer">User</SelectItem>
                        <SelectItem value="dealer">Dealer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="p-4">
                    <Select
                      value={user.plan || "free"}
                      onValueChange={(value) => handlePlanChange(user.id, value)}
                      disabled={busyUserId === user.id}
                    >
                      <SelectTrigger className="h-8 w-28 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="garage">Garage</SelectItem>
                        <SelectItem value="dealer">Dealer</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  <td className="p-4 text-sm text-muted-foreground">
                    {user.created_at
                      ? moment(user.created_at).format("MMM D, YYYY")
                      : "-"}
                  </td>

                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Badge
                        className={`rounded-full px-2 py-1 text-xs ${
                          user.is_banned
                            ? "bg-red-100 text-red-600"
                            : roleColors[role] || roleColors.buyer
                        }`}
                      >
                        {user.is_banned ? "Banned" : role}
                      </Badge>

                      <Button
                        size="sm"
                        variant={user.is_banned ? "secondary" : "outline"}
                        className={`px-3 text-xs ${
                          user.is_banned
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "border-red-200 text-red-600 hover:bg-red-50"
                        }`}
                        onClick={() => toggleBan(user)}
                        disabled={busyUserId === user.id}
                      >
                        {user.is_banned ? "Unban" : "Ban"}
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        className="px-3 text-xs"
                        onClick={() => deleteUser(user.id)}
                        disabled={busyUserId === user.id}
                      >
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
    </div>
  );
}
