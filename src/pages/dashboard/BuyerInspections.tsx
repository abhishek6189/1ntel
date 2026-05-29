import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import GlobalLoader from "@/components/GlobalLoader";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const BuyerInspections = () => {

  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from("inspection_requests")
      .select("*")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setInspections([]);
      setLoading(false);
      return;
    }

    const carIds = data.map((item: any) => item.car_id);

    const { data: cars } = await (supabase as any)
      .from("cars")
      .select("*")
      .in("id", carIds);

    const merged = data.map((insp: any) => {
      const car = cars.find((c: any) => c.id === insp.car_id);
      return { ...insp, car };
    });

    setInspections(merged);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 flex flex-col lg:flex-row gap-6 lg:gap-8">

        <DashboardSidebar />

        <div className="flex-1 min-w-0">

          <h1 className="text-2xl font-bold mb-6">
            Inspection Requests
          </h1>

          {loading ? (
            <GlobalLoader className="py-12" />
          ) : inspections.length === 0 ? (
            <p>No inspection requests yet</p>
          ) : (

            <div className="space-y-4">

              {inspections.map((item) => (

                <div
                  key={item.id}
                  className="bg-white border rounded-xl p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
                >

                  <div>
                    <p className="font-semibold">
                      {item.car?.title}
                    </p>

                    <p className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">

                    <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded text-sm">
                      {item.status}
                    </span>

                    <Link
                      to={`/car/${item.car_id}`}
                      className="text-blue-500 text-sm"
                    >
                      View Car
                    </Link>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
};

export default BuyerInspections;
