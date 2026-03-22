import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/Breadcrumbs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

import {
  Users,
  Car,
  ClipboardCheck,
  MessageSquare,
  BarChart3,
  Shield
} from "lucide-react";

import { motion } from "framer-motion";

const AdminDashboard = () => {

  const [stats, setStats] = useState({
    users: 0,
    listings: 0,
    inspections: 0,
    chats: 0
  });

  const [usersList, setUsersList] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  /* ================= FETCH STATS ================= */

  const fetchStats = async () => {
    try {

      // USERS COUNT
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // MOCK FOR NOW (you will connect later)
      const listingsCount = 0;
      const inspectionsCount = 0;
      const chatsCount = 0;

      setStats({
        users: usersCount || 0,
        listings: listingsCount,
        inspections: inspectionsCount,
        chats: chatsCount
      });

    } catch (err) {
      console.error(err);
    }
  };

  /* ================= FETCH USERS ================= */

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, role, created_at");

      if (error) {
        console.error(error);
        return;
      }

      setUsersList(data || []);

    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen">

      <Navbar />

      <div className="container py-8">

        <Breadcrumbs />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

          {/* HEADER */}
          <div className="flex items-center gap-3 mb-8">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your entire platform
              </p>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

            <div className="glass p-5 rounded-xl">
              <Users className="mb-2" />
              <p className="text-2xl font-bold">{stats.users}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>

            <div className="glass p-5 rounded-xl">
              <Car className="mb-2" />
              <p className="text-2xl font-bold">{stats.listings}</p>
              <p className="text-sm text-muted-foreground">Listings</p>
            </div>

            <div className="glass p-5 rounded-xl">
              <ClipboardCheck className="mb-2" />
              <p className="text-2xl font-bold">{stats.inspections}</p>
              <p className="text-sm text-muted-foreground">Inspections</p>
            </div>

            <div className="glass p-5 rounded-xl">
              <MessageSquare className="mb-2" />
              <p className="text-2xl font-bold">{stats.chats}</p>
              <p className="text-sm text-muted-foreground">Chats</p>
            </div>

          </div>

          {/* USERS TABLE */}
          <div className="glass p-6 rounded-xl">

            <h2 className="text-xl font-semibold mb-4">
              All Users
            </h2>

            <div className="space-y-3">

              {usersList.map((user) => (
                <div
                  key={user.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <span className="px-3 py-1 text-xs rounded-full bg-gray-200">
                    {user.role}
                  </span>
                </div>
              ))}

              {usersList.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No users found
                </p>
              )}

            </div>

          </div>

        </motion.div>

      </div>

      <Footer />

    </div>
  );
};

export default AdminDashboard;