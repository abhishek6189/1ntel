import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSidebar from "../../components/DashboardSidebar";
import Breadcrumbs from "@/components/Breadcrumbs";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const BuyerDashboard = () => {

const [profile, setProfile] = useState<any>(null);
const [carsCount, setCarsCount] = useState(0);
const [inspectionCount, setInspectionCount] = useState(0);

useEffect(() => {
loadDashboard();
}, []);

const loadDashboard = async () => {


const { data: { user } } = await supabase.auth.getUser();

if (!user) return;

/* PROFILE */

const { data: profileData } = await (supabase as any)
  .from("profiles")
  .select("*")
  .eq("id", user.id)
  .single();

if (profileData) setProfile(profileData);

/* CARS COUNT */

const { count } = await (supabase as any)
  .from("cars")
  .select("*", { count: "exact", head: true })
  .eq("seller_id", user.id);

setCarsCount(count || 0);

/* INSPECTIONS */

const { count: inspectionTotal } = await (supabase as any)
  .from("inspection_requests")
  .select("*", { count: "exact", head: true })
  .eq("buyer_id", user.id);

setInspectionCount(inspectionTotal || 0);


};

return (


<div className="min-h-screen bg-gray-50">

  <Navbar />

  <div className="max-w-7xl mx-auto py-10 px-4">

    {/* BREADCRUMB */}

    <Breadcrumbs />

    <div className="flex gap-8">

      <DashboardSidebar />

      <div className="flex-1 space-y-8">

        {/* PROFILE CARD */}

        {profile && (

          <div className="bg-white border rounded-xl p-6 flex justify-between items-center shadow-sm">

            <div className="flex gap-4 items-center">

              <img
                src={
                  profile.avatar_url ||
                  `https://ui-avatars.com/api/?name=${profile.email}`
                }
                className="w-16 h-16 rounded-full"
              />

              <div>

                <h2 className="font-semibold text-lg">
                  {profile.full_name || "User"}
                </h2>

                <p className="text-sm text-gray-500">
                  {profile.email}
                </p>

              </div>

            </div>

            <Badge>
              Plan: {profile.plan || "free"}
            </Badge>

          </div>

        )}

        {/* STATS */}

        <div className="grid grid-cols-3 gap-6">

          <div className="bg-white border rounded-xl p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Cars Listed
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {carsCount}
            </h2>

          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Inspections
            </p>

            <h2 className="text-2xl font-bold mt-2">
              {inspectionCount}
            </h2>

          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">

            <p className="text-sm text-gray-500">
              Saved Cars
            </p>

            <h2 className="text-2xl font-bold mt-2">
              0
            </h2>

          </div>

        </div>

        {/* RECENT ACTIVITY */}

        <div className="bg-white border rounded-xl p-6 shadow-sm">

          <h2 className="font-semibold mb-4">
            Recent Activity
          </h2>

          <p className="text-gray-500 text-sm">
            Your recent activity will appear here.
          </p>

        </div>

      </div>

    </div>

  </div>

  <Footer />

</div>


);

};

export default BuyerDashboard;
