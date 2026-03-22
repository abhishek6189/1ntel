import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";

const BuyerOverview = () => {

  const [savedCount, setSavedCount] = useState(0);
  const [inspectionCount, setInspectionCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ✅ SAVED CARS COUNT
    const { count: saved } = await (supabase as any)
      .from("saved_cars")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    setSavedCount(saved || 0);

    // ✅ INSPECTION COUNT
    const { count: inspections } = await (supabase as any)
      .from("inspection_requests")
      .select("*", { count: "exact", head: true })
      .eq("buyer_id", user.id);

    setInspectionCount(inspections || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-7xl mx-auto py-10 px-4 flex gap-8">

        <DashboardSidebar />

        <div className="flex-1">

          <h1 className="text-3xl font-bold mb-6">
            Dashboard Overview
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <div className="bg-white p-6 rounded-xl border">
              <p className="text-gray-500">Saved Cars</p>
              <h2 className="text-2xl font-bold">{savedCount}</h2>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <p className="text-gray-500">Inspections</p>
              <h2 className="text-2xl font-bold">{inspectionCount}</h2>
            </div>

            <div className="bg-white p-6 rounded-xl border">
              <p className="text-gray-500">Payments</p>
              <h2 className="text-2xl font-bold">0</h2>
            </div>

          </div>

        </div>

      </div>

      <Footer />

    </div>
  );
};

export default BuyerOverview;