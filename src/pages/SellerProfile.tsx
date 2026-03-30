import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [seller, setSeller] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      /* SELLER */
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      setSeller(sellerData);

      /* CARS */
      const { data: carsData } = await supabase
        .from("cars")
        .select(`
          *,
          car_images (image_url)
        `)
        .eq("seller_id", id)
        .order("created_at", { ascending: false });

      setCars(carsData || []);
      setLoading(false);
    };

    load();
  }, [id]);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-gray-600"
        >
          ← Back
        </button>

        {/* SELLER HEADER */}
        <div className="bg-white border rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4 mb-6">

          <img
            src={seller?.avatar_url || "https://i.pravatar.cc/150"}
            className="w-20 h-20 rounded-full object-cover"
          />

          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold">
              {seller?.full_name || "User"}
            </h2>

            <p className="text-gray-500 text-sm">
              {seller?.email}
            </p>

            {seller?.phone && (
              <p className="text-sm mt-1">
                📞 {seller.phone}
              </p>
            )}

            <p className="text-xs mt-2">
              {seller?.is_verified
                ? "✅ Verified Seller"
                : "⚠️ Not Verified"}
            </p>
          </div>

          <div className="ml-auto text-center">
            <p className="text-2xl font-bold">{cars.length}</p>
            <p className="text-sm text-gray-500">Listings</p>
          </div>

        </div>

        {/* LISTINGS */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Listings by Seller
          </h3>

          {cars.length === 0 ? (
            <div className="bg-white border rounded-xl p-10 text-center">
              No listings found
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

              {cars.map((car) => (
                <div
                  key={car.id}
                  onClick={() => navigate(`/car/${car.id}`)}
                  className="bg-white border rounded-xl overflow-hidden cursor-pointer hover:shadow-lg transition"
                >

                  <img
                    src={
                      car.car_images?.[0]?.image_url ||
                      "https://via.placeholder.com/300"
                    }
                    className="w-full h-40 object-cover"
                  />

                  <div className="p-4">

                    <h4 className="font-semibold text-sm line-clamp-1">
                      {car.title}
                    </h4>

                    <p className="text-xs text-gray-500">
                      {car.location} • {car.year}
                    </p>

                    <p className="font-bold mt-2">
                      ${Number(car.price).toLocaleString()}
                    </p>

                    {car.is_verified && (
                      <span className="text-green-600 text-xs">
                        Verified
                      </span>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}
        </div>

      </div>

      <Footer />
    </div>
  );
};

export default SellerProfile;