import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp
} from "lucide-react";

const DealerAnalytics = () => {

  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) return;

    const { data: carsData } = await supabase
      .from("cars")
      .select("*")
      .eq("seller_id", user.id);

    setCars(carsData || []);
    setLoading(false);
  };

  /* ================= STATS ================= */
  const totalCars = cars.length;
  const activeCars = cars.filter(c => c.status === "active").length;
  const pendingCars = cars.filter(c => c.status === "pending").length;
  const totalValue = cars.reduce((sum, c) => sum + (c.price || 0), 0);

  const avgPrice =
    totalCars > 0 ? Math.round(totalValue / totalCars) : 0;
  const formatPrice = (value: any) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const activePercent =
    totalCars > 0 ? Math.round((activeCars / totalCars) * 100) : 0;

  /* ================= 🔥 ADVANCED MONTHLY ================= */
  const monthlyMap: any = {};

  cars.forEach(car => {
    const d = new Date(car.created_at);

    const key = d.toLocaleString("default", {
      month: "short",
      year: "numeric"
    });

    if (!monthlyMap[key]) {
      monthlyMap[key] = {
        count: 0,
        totalValue: 0,
        soldValue: 0,
        entries: []
      };
    }

    monthlyMap[key].count += 1;
    monthlyMap[key].totalValue += car.price || 0;

    if (car.status === "sold") {
      monthlyMap[key].soldValue += car.price || 0;
    }

    monthlyMap[key].entries.push({
      time: d.toLocaleString(),
      price: car.price
    });
  });

  const monthly = Object.entries(monthlyMap);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          Analytics
        </h1>
        <p className="text-gray-500 text-sm">
          Smart insights of your dealership 🚀
        </p>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <Card icon={<Car />} label="Total Cars" value={totalCars} />
        <Card icon={<CheckCircle />} label="Active" value={activeCars} />
        <Card icon={<Clock />} label="Pending" value={pendingCars} />
        <Card icon={<DollarSign />} label="Value" value={formatPrice(totalValue)} />

      </div>

      {/* ================= EXTRA INSIGHTS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">

        <Card icon={<TrendingUp />} label="Avg Price" value={formatPrice(avgPrice)} />

        <Card
          icon={<CheckCircle />}
          label="Success Rate"
          value={`${activePercent}%`}
        />

      </div>

      {/* ================= 🔥 MONTHLY ADVANCED ================= */}
      <div className="bg-white p-4 rounded-xl shadow">

        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 size={18}/> Monthly Analytics
        </h2>

        {monthly.length === 0 ? (
          <p className="text-gray-400">No data yet</p>
        ) : (
          <div className="space-y-4">

            {monthly.map(([month, data]: any) => (
              <div key={month} className="border rounded-lg p-3 space-y-2">

                {/* HEADER */}
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                  <p className="font-semibold">{month}</p>
                  <p className="text-sm text-gray-500">
                    Listings: {data.count}
                  </p>
                </div>

                {/* VALUES */}
                <div className="flex flex-col sm:flex-row sm:justify-between text-sm gap-2">

                  <span className="text-blue-600">
                    Total Value: {formatPrice(data.totalValue)}
                  </span>

                  <span className="text-green-600">
                    Sold Value: {formatPrice(data.soldValue)}
                  </span>

                </div>

                {/* BAR */}
                <div className="w-full bg-gray-200 h-2 rounded">
                  <div
                    className="bg-blue-600 h-2 rounded transition-all"
                    style={{ width: `${Math.min(data.count * 10, 100)}%` }}
                  />
                </div>

                {/* 🔥 TIME DETAILS */}
                <div className="text-xs text-gray-500 space-y-1 max-h-20 overflow-auto">
                  {data.entries.map((e: any, i: number) => (
                    <p key={i}>
                      {e.time} → {formatPrice(e.price)}
                    </p>
                  ))}
                </div>

              </div>
            ))}

          </div>
        )}

      </div>

      {/* ================= TOP CARS ================= */}
      <div className="bg-white p-4 rounded-xl shadow">

        <h2 className="font-semibold mb-4">
          Top Listings
        </h2>

        {cars.length === 0 ? (
          <p className="text-gray-400">No cars yet</p>
        ) : (
          cars
            .sort((a, b) => b.price - a.price)
            .slice(0, 5)
            .map(car => (
              <div
                key={car.id}
                className="flex justify-between gap-3 py-2 border-b text-sm"
              >
                <span className="truncate">{car.title}</span>
                <span className="shrink-0 font-semibold">{formatPrice(car.price)}</span>
              </div>
            ))
        )}

      </div>

    </div>
  );
};

export default DealerAnalytics;

/* ================= CARD ================= */
const Card = ({ icon, label, value }: any) => (
  <div className="bg-white p-4 rounded-xl shadow flex items-center gap-3 min-w-0">
    <div className="text-blue-600">{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="break-words text-lg font-bold sm:text-xl">{value}</p>
    </div>
  </div>
);
