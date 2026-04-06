import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Plus, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const DealerListings = () => {

  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSoldPopup, setShowSoldPopup] = useState<any>(null);
  const [celebrate, setCelebrate] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    const { data: carsData } = await supabase
      .from("cars")
      .select(`
        *,
        car_images (image_url)
      `)
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false });

    setCars(carsData || []);
    setLoading(false);
  };

  /* ================= DELETE ================= */
  const deleteCar = async (id: string) => {
    const confirmDelete = confirm("Delete this car?");
    if (!confirmDelete) return;

    await supabase.from("cars").delete().eq("id", id);

    setCars((prev) => prev.filter((c) => c.id !== id));
    toast.success("Car deleted");
  };

  /* ================= FEATURE ================= */
  const makeFeatured = async (id: string) => {
    await supabase
      .from("cars")
      .update({
        is_featured: true,
        featured_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      })
      .eq("id", id);

    toast.success("Car featured for 7 days 🚀");
    load();
  };

  /* ================= SOLD ================= */
  const markAsSold = async (car: any, fromPlatform: boolean) => {

    const { error } = await supabase
      .from("cars")
      .update({
        status: "sold",
        sold_from_platform: fromPlatform,
        sold_at: new Date().toISOString()
      })
      .eq("id", car.id);

    if (error) {
      console.error(error);
      toast.error("Failed to update");
      return;
    }

    setShowSoldPopup(null);

    if (fromPlatform) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3000);
      toast.success("🎉 Congrats! Sold via platform!");
    } else {
      toast("Keep pushing! More buyers coming 🚀");
    }

    load();
  };

  /* ================= 🔥 NEW: UNSOLD ================= */
  const markAsUnsold = async (car: any) => {

    const { error } = await supabase
      .from("cars")
      .update({
        status: "active",
        sold_from_platform: false,
        sold_at: null
      })
      .eq("id", car.id);

    if (error) {
      console.error(error);
      toast.error("Failed to update");
      return;
    }

    toast.success("Car marked as unsold");
    load();
  };

  /* ================= 🔥 NEW: FILTER ================= */
  const activeCars = cars.filter(c => c.status !== "sold");
  const soldCars = cars.filter(c => c.status === "sold");

  return (
    <div className="p-4 md:p-6 space-y-6 relative">

      {/* 🎉 CELEBRATION */}
      {celebrate && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-4xl animate-bounce">🚗🎉</div>
        </div>
      )}

      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            My Listings
          </h1>
          <p className="text-sm text-gray-500">
            Manage all your car listings
          </p>
        </div>

        <button
          onClick={() => navigate("/dashboard/create-listing")}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} />
          Add Car
        </button>

      </div>

      {/* ================= LOADING ================= */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : cars.length === 0 ? (

        <div className="text-center py-20">
          <p className="text-gray-400 text-lg">
            No cars yet 🚀
          </p>
          <button
            onClick={() => navigate("/dashboard/create-listing")}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Add your first car
          </button>
        </div>

      ) : (

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

          {activeCars.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden"
            >

              {/* IMAGE */}
              <div className="relative">
                <img
                  src={car.car_images?.[0]?.image_url || "/placeholder.png"}
                  className="w-full h-44 object-cover"
                />

                {car.is_featured && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-xs px-2 py-1 rounded text-white flex items-center gap-1">
                    <Star size={12} /> Featured
                  </span>
                )}
              </div>

              {/* CONTENT */}
              <div className="p-4 space-y-2">

                <p className="font-semibold truncate">
                  {car.title}
                </p>

                <p className="text-sm text-gray-500">
                  ₹ {car.price}
                </p>

                {/* STATUS */}
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-600">
                  Active
                </span>

                {/* ACTIONS */}
                <div className="flex justify-between items-center pt-3">

                  <button
                    onClick={() => navigate(`/car/${car.id}`)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View
                  </button>

                  <div className="flex gap-3 items-center">

                    <button
                      onClick={() => setShowSoldPopup(car)}
                      className="text-green-600 text-xs font-semibold"
                    >
                      Sold
                    </button>

                    <button
                      onClick={() => makeFeatured(car.id)}
                      className="text-yellow-500 hover:scale-110"
                    >
                      <Star size={16} />
                    </button>

                    <button
                      className="text-blue-600 hover:scale-110"
                      onClick={() => navigate(`/dashboard/create-listing?id=${car.id}`)}
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      className="text-red-500 hover:scale-110"
                      onClick={() => deleteCar(car.id)}
                    >
                      <Trash2 size={16} />
                    </button>

                  </div>

                </div>

              </div>

            </div>
          ))}

        </div>
      )}

      {/* ================= 🔥 SOLD SECTION ================= */}
      {soldCars.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">
            Sold Cars
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {soldCars.map((car) => (
              <div
                key={car.id}
                className="bg-white rounded-xl shadow border border-green-200 overflow-hidden"
              >

                <img
                  src={car.car_images?.[0]?.image_url || "/placeholder.png"}
                  className="w-full h-40 object-cover"
                />

                <div className="p-4 space-y-2">

                  <p className="font-semibold">{car.title}</p>

                  <p className="text-sm text-gray-500">
                    ₹ {car.price}
                  </p>

                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                    Sold
                  </span>

                  <button
                    onClick={() => markAsUnsold(car)}
                    className="mt-2 w-full bg-gray-200 hover:bg-gray-300 text-sm py-2 rounded-lg"
                  >
                    Mark as Unsold
                  </button>

                </div>

              </div>
            ))}

          </div>
        </div>
      )}

      {/* ================= SOLD POPUP ================= */}
      {showSoldPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm text-center space-y-4">

            <h2 className="text-lg font-semibold">
              Sold from platform?
            </h2>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => markAsSold(showSoldPopup, true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Yes
              </button>

              <button
                onClick={() => markAsSold(showSoldPopup, false)}
                className="bg-gray-200 px-4 py-2 rounded-lg"
              >
                No
              </button>
            </div>

            <button
              onClick={() => setShowSoldPopup(null)}
              className="text-sm text-gray-500"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default DealerListings;