import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

import { Search } from 'lucide-react';
import { toast } from "sonner";
import moment from 'moment';

export default function AdminUsers({ users, onRefresh }) {

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && (u.role || 'buyer') !== roleFilter) return false;

    if (search) {
      const s = search.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s)
      );
    }

    return true;
  });

  /* ================= ROLE ================= */
  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) return toast.error("Role update failed");

    toast.success("Role updated");
    onRefresh();
  };

  /* ================= PLAN ================= */
  const handlePlanChange = async (userId, newPlan) => {
    const { error } = await supabase
      .from("profiles")
      .update({ plan: newPlan })
      .eq("id", userId);

    if (error) return toast.error("Plan update failed");

    toast.success("Plan updated");
    onRefresh();
  };

  /* ================= BAN ================= */
  const toggleBan = async (user) => {

    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !user.is_banned })
      .eq("id", user.id);

    if (error) return toast.error("Failed");

    toast.success(user.is_banned ? "User unbanned" : "User banned");
    onRefresh();
  };

  /* ================= DELETE ================= */
  const deleteUser = async (userId) => {

    if (!confirm("Delete this user permanently?")) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) return toast.error("Delete failed");

    toast.success("User deleted");
    onRefresh();
  };

  /* ================= BADGE COLORS ================= */
  const roleColors = {
    admin: "bg-purple-100 text-purple-700",
    dealer: "bg-blue-100 text-blue-700",
    buyer: "bg-gray-100 text-gray-700",
  };

  return (
    <div>

      {/* 🔥 HEADER */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            placeholder="Search users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl"
          />
        </div>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40 h-10 rounded-xl">
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

      {/* 🔥 TABLE */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-x-auto">

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

            {filtered.map(user => (

              <tr
                key={user.id}
                className="border-t hover:bg-gray-50 transition-all duration-200"
              >

                {/* USER */}
                <td className="p-4 max-w-[240px]">
                  <p className="font-medium text-foreground truncate">
                    {user.full_name || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </td>

                {/* ROLE */}
                <td className="p-4">
                  <Select
                    value={user.role || 'buyer'}
                    onValueChange={v => handleRoleChange(user.id, v)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="buyer">User</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* PLAN */}
                <td className="p-4">
                  <Select
                    value={user.plan || 'free'}
                    onValueChange={v => handlePlanChange(user.id, v)}
                  >
                    <SelectTrigger className="h-8 w-28 text-xs rounded-lg">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="garage">Garage</SelectItem>
                      <SelectItem value="dealer">Dealer</SelectItem>
                    </SelectContent>
                  </Select>
                </td>

                {/* DATE */}
                <td className="p-4 text-muted-foreground text-sm">
                  {user.created_at
                    ? moment(user.created_at).format('MMM D, YYYY')
                    : '—'}
                </td>

                {/* ACTIONS */}
                <td className="p-4">
                  <div className="flex items-center justify-end gap-2">

                    {/* STATUS */}
                    <Badge
                      className={`text-xs px-2 py-1 rounded-full ${
                        user.is_banned
                          ? "bg-red-100 text-red-600"
                          : roleColors[user.role] || roleColors.buyer
                      }`}
                    >
                      {user.is_banned ? "Banned" : user.role || "user"}
                    </Badge>

                    {/* BAN / UNBAN */}
                    <Button
                      size="sm"
                      variant={user.is_banned ? "secondary" : "outline"}
                      className={`text-xs px-3 ${
                        user.is_banned
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "hover:bg-red-50 text-red-600 border-red-200"
                      }`}
                      onClick={() => toggleBan(user)}
                    >
                      {user.is_banned ? "Unban" : "Ban"}
                    </Button>

                    {/* DELETE */}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="text-xs px-3"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </Button>

                  </div>
                </td>

              </tr>

            ))}

          </tbody>

        </table>
      </div>
    </div>
  );
}
