import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, Users, Star, Shield, BarChart3, Building2, Mail } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import BrandLogo from "@/components/BrandLogo";
import GlobalLoader from "@/components/GlobalLoader";
import { toast } from "sonner";
import { getFunctionErrorMessage } from "@/utils/functionErrors";

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
    subscriptions: [],
    listingCreditPayments: [],
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
      .or("status.is.null,status.neq.removed")
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

    let subscriptions: any[] = [];
    let listingCreditPayments: any[] = [];
    const { data: metricsData, error: metricsError } = await supabase.functions.invoke("admin-metrics");

    if (!metricsError && !metricsData?.error) {
      subscriptions = metricsData?.subscriptions || [];
      listingCreditPayments = metricsData?.listingCreditPayments || [];
    } else if (metricsError) {
      toast.error(await getFunctionErrorMessage(metricsError, "Could not load billing metrics"));
    } else if (metricsData?.error) {
      toast.error(metricsData.error);
    }

    if (carsError) toast.error("Could not load listings");
    if (usersError) toast.error("Could not load users");

    const subscriptionsByUserId = new Map<string, any[]>();
    const addSubscriptionForKey = (key: string | null | undefined, subscription: any) => {
      if (!key) return;
      const rows = subscriptionsByUserId.get(key) || [];
      rows.push(subscription);
      subscriptionsByUserId.set(key, rows);
    };

    for (const subscription of subscriptions || []) {
      addSubscriptionForKey(subscription.user_id, subscription);
    }

    const getSubscriptionRank = (subscription: any) => {
      const status = String(subscription?.status || "").toLowerCase();
      if (status === "active" || status === "trialing") return 3;
      if (status === "past_due") return 2;
      return 1;
    };

    const getSubscriptionTime = (subscription: any) =>
      new Date(subscription?.current_period_end || subscription?.created_at || 0).getTime() || 0;

    const usersWithBilling = (users || []).map((user: any) => {
      const subscriptionIds = new Set<string>();
      const userSubscriptions = [user.id, user.user_id]
        .filter(Boolean)
        .flatMap((key) => subscriptionsByUserId.get(key) || [])
        .filter((subscription) => {
          if (!subscription?.id) return true;
          if (subscriptionIds.has(subscription.id)) return false;
          subscriptionIds.add(subscription.id);
          return true;
        });

      const latestSubscription = [...userSubscriptions].sort((a, b) => {
        const rankDiff = getSubscriptionRank(b) - getSubscriptionRank(a);
        if (rankDiff) return rankDiff;
        return getSubscriptionTime(b) - getSubscriptionTime(a);
      })[0];

      return {
        ...user,
        subscriptions: userSubscriptions,
        subscription: latestSubscription || null,
        subscription_status: latestSubscription?.status || null,
        subscription_plan: latestSubscription?.plan || null,
        current_period_end: latestSubscription?.current_period_end || null,
      };
    });

    const userMap = new Map<string, any>();
    usersWithBilling.forEach((user: any) => {
      if (user.id) userMap.set(user.id, user);
      if (user.user_id) userMap.set(user.user_id, user);
    });
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
      users: usersWithBilling,
      subscriptions,
      listingCreditPayments,
      inspections: enrichedInspections,
      contactMessages
    });

    setLoading(false);
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <GlobalLoader className="min-h-[60vh]" />;
  }

  return (

    <div className="min-h-screen bg-slate-50">

      {/* 🔥 HEADER */}
      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">

        {/* CENTER LOGO */}
        <div className="mb-3 flex justify-center">
          <BrandLogo className="text-3xl drop-shadow-sm sm:text-4xl" />
        </div>

        {/* TITLE */}
        <div className="mb-5 text-center">
          <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your marketplace
          </p>
        </div>

        {/* LOGOUT BUTTON */}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="static mx-auto mt-4 block rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-red-600 sm:absolute sm:right-6 sm:top-5 sm:mt-0"
        >
          Logout
        </button>

      </div>

      {/* 🔥 MAIN CONTENT */}
      <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">

        <div className="rounded-xl border bg-white p-3 shadow-sm sm:p-4">

          <Tabs defaultValue="overview">

            {/* TABS */}
            <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl bg-slate-100 p-2">

              <TabsTrigger value="overview" className="shrink-0 gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-4 w-4" /> Overview
              </TabsTrigger>

              <TabsTrigger value="listings" className="shrink-0 gap-2 text-xs sm:text-sm">
                <Car className="h-4 w-4" /> Listings
              </TabsTrigger>

              <TabsTrigger value="users" className="shrink-0 gap-2 text-xs sm:text-sm">
                <Users className="h-4 w-4" /> Users
              </TabsTrigger>

              <TabsTrigger value="dealers" className="shrink-0 gap-2 text-xs sm:text-sm">
                <Building2 className="h-4 w-4" /> Dealers
              </TabsTrigger>

              <TabsTrigger value="featured" className="shrink-0 gap-2 text-xs sm:text-sm">
                <Star className="h-4 w-4" /> Featured
              </TabsTrigger>

              <TabsTrigger value="inspections" className="shrink-0 gap-2 text-xs sm:text-sm">
                <Shield className="h-4 w-4" /> Inspections
              </TabsTrigger>

              <TabsTrigger value="contact" className="shrink-0 gap-2 text-xs sm:text-sm">
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
