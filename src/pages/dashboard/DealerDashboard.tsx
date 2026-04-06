import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Car, DollarSign, CheckCircle, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

type CarType = {
  id: string;
  title: string;
  price: number;
  status: string;
  car_images?: { image_url: string }[];
};

const DealerDashboard = () => {
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();

    // 🔥 AUTO REFRESH (Realtime feel)
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    // ✅ FIXED TABLE + IMAGES JOIN
    const { data } = await supabase
      .from("cars")
      .select(`
        *,
        car_images (image_url)
      `)
      .eq("seller_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (data) setCars(data);

    setLoading(false);
  };

  /* ================= STATS ================= */
  const totalCars = cars.length;
  const activeCars = cars.filter((c) => c.status === "active").length;
  const pendingCars = cars.filter((c) => c.status === "pending").length;
  const totalValue = cars.reduce((sum, c) => sum + (c.price || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Dealer Dashboard
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your listings and track performance
          </p>
        </div>

        {/* 🔥 QUICK ACTION */}
        <button
          onClick={() => navigate("/dashboard/create-listing")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add Car
        </button>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <Card icon={<Car />} label="Total Cars" value={totalCars} />

        <Card icon={<CheckCircle />} label="Active" value={activeCars} color="green" />

        <Card icon={<Clock />} label="Pending" value={pendingCars} color="yellow" />

        <Card
          icon={<DollarSign />}
          label="Total Value"
          value={`₹ ${totalValue.toLocaleString()}`}
          color="purple"
        />

      </div>

      {/* ================= LISTINGS ================= */}
      <div className="bg-white rounded-xl shadow p-4">

        <h2 className="text-lg font-semibold mb-4">
          Recent Listings
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : cars.length === 0 ? (
          <p className="text-gray-400">
            No listings yet 🚀
          </p>
        ) : (
          <div className="space-y-4">

            {cars.slice(0, 5).map((car) => (
              <div
                key={car.id}
                className="flex gap-3 items-center justify-between p-3 border rounded-xl hover:shadow-sm transition cursor-pointer"
                onClick={() => navigate(`/dealer-dashboard/listings`)}
              >

                {/* IMAGE */}
                <img
                  src={car.car_images?.[0]?.image_url || "/placeholder.png"}
                  className="w-14 h-14 rounded-lg object-cover"
                />

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{car.title}</p>
                  <p className="text-sm text-gray-500">
                    ₹ {car.price}
                  </p>
                </div>

                {/* STATUS */}
                <span
                  className={`text-xs px-3 py-1 rounded-full ${
                    car.status === "active"
                      ? "bg-green-100 text-green-600"
                      : car.status === "pending"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {car.status}
                </span>

              </div>
            ))}

          </div>
        )}

      </div>

    </div>
  );
};

export default DealerDashboard;

/* ================= REUSABLE CARD ================= */
const Card = ({ icon, label, value, color = "blue" }: any) => {
  const colors: any = {
    blue: "text-blue-600",
    green: "text-green-600",
    yellow: "text-yellow-500",
    purple: "text-purple-600",
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3">
      <div className={colors[color]}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg md:text-xl font-bold">{value}</p>
      </div>
    </div>
  );
};