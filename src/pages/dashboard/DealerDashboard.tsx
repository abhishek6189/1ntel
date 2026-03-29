import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Car = {
  id: string;
  title: string;
  price: number;
  status: string;
};

const DealerDashboard = () => {
  const [cars, setCars] = useState<Car[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("car_listings")
      .select("*")
      .eq("seller_id", auth.user.id);

    if (data) setCars(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dealer Dashboard</h1>

      {cars.map(car => (
        <div key={car.id}>
          {car.title} - ${car.price} ({car.status})
        </div>
      ))}
    </div>
  );
};

export default DealerDashboard;