import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Users, Star, Shield, BarChart3, Building2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

import AdminOverview from "../components/admin/AdminOverview";
import AdminListings from "../components/admin/AdminListings";
import AdminUsers from "../components/admin/AdminUsers";
import AdminFeatured from "../components/admin/AdminFeatured";
import AdminInspections from "../components/admin/AdminInspections";
import AdminDealers from "../components/admin/AdminDealers";

export default function AdminDashboard() {

  const [stats, setStats] = useState({
    cars: [],
    users: [],
    inspections: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const { data: cars } = await supabase.from("cars").select("*");
    const { data: users } = await supabase.from("profiles").select("*");
    const { data: inspections } = await supabase.from("inspections").select("*");

    setStats({
      cars: cars || [],
      users: users || [],
      inspections: inspections || []
    });

    setLoading(false);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">

      {/* 🔥 HEADER */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* CENTER LOGO */}
        <div className="flex justify-center mb-4">
          <img
            src="/logo.png"
            alt="1ntel"
            className="h-12 object-contain drop-shadow-md"
          />
        </div>

        {/* TITLE */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your marketplace
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm shadow"
        >
          Logout
        </button>

      </div>

      {/* 🔥 MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">

        <div className="bg-white rounded-2xl shadow-sm border p-4">

          <Tabs defaultValue="overview">

            {/* TABS */}
            <TabsList className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-xl">

              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" /> Overview
              </TabsTrigger>

              <TabsTrigger value="listings" className="gap-2">
                <Car className="h-4 w-4" /> Listings
              </TabsTrigger>

              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>

              <TabsTrigger value="dealers" className="gap-2">
                <Building2 className="h-4 w-4" /> Dealers
              </TabsTrigger>

              <TabsTrigger value="featured" className="gap-2">
                <Star className="h-4 w-4" /> Featured
              </TabsTrigger>

              <TabsTrigger value="inspections" className="gap-2">
                <Shield className="h-4 w-4" /> Inspections
              </TabsTrigger>

            </TabsList>

            {/* CONTENT */}
            <TabsContent value="overview" className="mt-6">
              <AdminOverview stats={stats} />
            </TabsContent>

            <TabsContent value="listings" className="mt-6">
              <AdminListings cars={stats.cars} onRefresh={fetchAll} />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <AdminUsers users={stats.users} onRefresh={fetchAll} />
            </TabsContent>

            <TabsContent value="featured" className="mt-6">
              <AdminFeatured cars={stats.cars} onRefresh={fetchAll} />
            </TabsContent>

            <TabsContent value="dealers" className="mt-6">
              <AdminDealers users={stats.users} onRefresh={fetchAll} />
            </TabsContent>

            <TabsContent value="inspections" className="mt-6">
              <AdminInspections inspections={stats.inspections} onRefresh={fetchAll} />
            </TabsContent>

          </Tabs>

        </div>

      </div>

    </div>
  );
}