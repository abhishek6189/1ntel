import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import GlobalLoader from "@/components/GlobalLoader";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

const SavedCars = () => {

  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedCars();
  }, []);

  const loadSavedCars = async () => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // STEP 1: GET SAVED IDS
    const { data: saved } = await (supabase as any)
      .from("saved_cars")
      .select("car_id")
      .eq("user_id", user.id);

    if (!saved || saved.length === 0) {
      setCars([]);
      setLoading(false);
      return;
    }

    const carIds = saved.map((item: any) => item.car_id);

    // STEP 2: FETCH CARS + IMAGES
    const { data: carsData } = await (supabase as any)
      .from("cars")
      .select(`
        *,
        car_images (image_url)
      `)
      .in("id", carIds);

    setCars(carsData || []);
    setLoading(false);
  };

  const removeCar = async (carId: string) => {

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from("saved_cars")
      .delete()
      .eq("user_id", user.id)
      .eq("car_id", carId);

    setCars(cars.filter(c => c.id !== carId));
  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-7xl mx-auto py-6 sm:py-10 px-4 flex flex-col lg:flex-row gap-6 lg:gap-8">

        <DashboardSidebar />

        <div className="flex-1 min-w-0">

          <h1 className="text-2xl font-bold mb-6">
            Saved Cars
          </h1>

          {loading ? (
            <GlobalLoader className="py-12" />
          ) : cars.length === 0 ? (
            <p>No saved cars yet</p>
          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              {cars.map((car) => (
                <div key={car.id} className="bg-white p-4 rounded-xl border shadow-sm">

                  {/* ✅ FIXED IMAGE */}
                  <img
                    src={
                      car.car_images?.[0]?.image_url ||
                      car.image_url ||
                      "https://via.placeholder.com/300"
                    }
                    className="w-full h-40 object-cover rounded-lg"
                  />

                  <h2 className="font-semibold mt-3">
                    {car.title}
                  </h2>

                  <p className="text-primary font-bold">
                    ${Number(car.price).toLocaleString()}
                  </p>

                  <Link
                    to={`/car/${car.id}`}
                    className="text-sm text-blue-500 mt-2 block"
                  >
                    View Details
                  </Link>

                  <button
                    onClick={() => removeCar(car.id)}
                    className="text-red-500 text-sm mt-2"
                  >
                    Remove
                  </button>

                </div>
              ))}

            </div>

          )}

        </div>

      </div>

    </div>
  );
};

export default SavedCars;
