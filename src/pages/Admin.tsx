import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Users, Star, Shield, BarChart3, Building2, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import { toast } from "sonner";

import AdminOverview from "../components/admin/AdminOverview";
import AdminListings from "../components/admin/AdminListings";
import AdminUsers from "../components/admin/AdminUsers";
import AdminFeatured from "../components/admin/AdminFeatured";
import AdminInspections from "../components/admin/AdminInspections";
import AdminDealers from "../components/admin/AdminDealers";
import AdminContactMessages from "../components/admin/AdminContactMessages";

export default function AdminDashboard() {

  const [stats, setStats] = useState({
    cars: [],
    users: [],
    inspections: [],
    contactMessages: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);

    const { data: cars, error: carsError } = await supabase
      .from("cars")
      .select("*, car_images(image_url)")
      .order("created_at", { ascending: false });

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    let inspections: any[] = [];
    const { data: inspectionRows, error: inspectionsError } = await (supabase as any)
      .from("inspection_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!inspectionsError) {
      inspections = inspectionRows || [];
    } else {
      const { data: legacyInspections } = await (supabase as any)
        .from("inspections")
        .select("*")
        .order("created_at", { ascending: false });

      inspections = legacyInspections || [];
    }

    let contactMessages: any[] = [];
    const { data: contactRows, error: contactError } = await (supabase as any)
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });

    if (!contactError) {
      contactMessages = contactRows || [];
    }

    if (carsError) toast.error("Could not load listings");
    if (usersError) toast.error("Could not load users");

    const userMap = new Map((users || []).map((user: any) => [user.id, user]));
    const enrichedCars = (cars || []).map((car: any) => ({
      ...car,
      seller: userMap.get(car.seller_id),
    }));

    const carMap = new Map(enrichedCars.map((car: any) => [car.id, car]));
    const enrichedInspections = (inspections || []).map((inspection: any) => {
      const carId = inspection.car_id || inspection.listing_id;
      const car = carMap.get(carId);
      const buyer = userMap.get(inspection.buyer_id || inspection.user_id);
      const seller = car?.seller;

      return {
        ...inspection,
        car_id: carId,
        car_title: inspection.car_title || car?.title || "Unknown Car",
        requester_email: inspection.requester_email || buyer?.email || "No email",
        requester_phone: inspection.requester_phone || buyer?.phone || "",
        seller_email: inspection.seller_email || seller?.email || "No email",
        seller_phone: inspection.seller_phone || seller?.phone || "",
      };
    });

    setStats({
      cars: enrichedCars,
      users: users || [],
      inspections: enrichedInspections,
      contactMessages
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

    <div className="min-h-screen bg-gray-50">

      {/* 🔥 HEADER */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">

        {/* CENTER LOGO */}
        <div className="flex justify-center mb-4">
          <BrandLogo className="text-5xl drop-shadow-sm" />
        </div>

        {/* TITLE */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
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
          className="static mx-auto mt-4 block rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow hover:bg-red-600 sm:absolute sm:right-6 sm:top-6 sm:mt-0"
        >
          Logout
        </button>

      </div>

      {/* 🔥 MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">

        <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-4">

          <Tabs defaultValue="overview">

            {/* TABS */}
            <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl bg-gray-100 p-2">

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

              <TabsTrigger value="contact" className="gap-2">
                <Mail className="h-4 w-4" /> Contact
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

            <TabsContent value="contact" className="mt-6">
              <AdminContactMessages messages={stats.contactMessages} onRefresh={fetchAll} />
            </TabsContent>

          </Tabs>

        </div>

      </div>

    </div>
  );
}
