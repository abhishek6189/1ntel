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

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

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
  const formatPrice = (value: any) => `₹ ${Number(value || 0).toLocaleString()}`;

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
            Dealer Dashboard
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm">
            Manage your listings and track performance
          </p>
        </div>

        {/* BUTTON */}
        <button
          onClick={() => navigate("/dashboard/create-listing")}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition shadow-sm"
        >
          + Add Car
        </button>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">

        <Card icon={<Car size={20} />} label="Total Cars" value={totalCars} />

        <Card
          icon={<CheckCircle size={20} />}
          label="Active"
          value={activeCars}
          color="green"
        />

        <Card
          icon={<Clock size={20} />}
          label="Pending"
          value={pendingCars}
          color="yellow"
        />

        <Card
          icon={<DollarSign size={20} />}
          label="Total Value"
          value={formatPrice(totalValue)}
          color="purple"
        />
      </div>

      {/* ================= LISTINGS ================= */}
      <div className="bg-white rounded-2xl shadow-sm border p-3 sm:p-4">

        <h2 className="text-base sm:text-lg font-semibold mb-4">
          Recent Listings
        </h2>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : cars.length === 0 ? (
          <p className="text-gray-400 text-sm">
            No listings yet 🚀
          </p>
        ) : (
          <div className="space-y-3 sm:space-y-4">

            {cars.slice(0, 5).map((car) => (
              <div
                key={car.id}
                className="flex items-center gap-3 p-3 border rounded-xl hover:shadow-md hover:border-blue-200 transition cursor-pointer"
                onClick={() => navigate(`/dealer-dashboard/listings`)}
              >

                {/* IMAGE */}
                <img
                  src={car.car_images?.[0]?.image_url || "/placeholder.png"}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover flex-shrink-0"
                />

                {/* INFO */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">
                    {car.title}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {formatPrice(car.price)}
                  </p>
                </div>

                {/* STATUS */}
                <span
                  className={`text-[10px] sm:text-xs px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${
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
    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border flex items-center gap-3 hover:shadow-md transition">

      <div className={`${colors[color]} bg-gray-50 p-2 rounded-lg`}>
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 truncate">
          {label}
        </p>
        <p className="text-base sm:text-lg md:text-xl font-bold truncate">
          {value}
        </p>
      </div>

    </div>
  );
};
