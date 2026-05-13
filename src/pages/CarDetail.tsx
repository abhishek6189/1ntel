import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Fuel,
  Settings,
  Gauge,
  MapPin,
  Car as CarIcon,
} from "lucide-react";

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [car, setCar] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [activeImage, setActiveImage] = useState("");

  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);

  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const { data: carData } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (!carData) return;
      setCar(carData);

      const { data: imgs } = await supabase
        .from("car_images")
        .select("*")
        .eq("car_id", id);

      if (imgs?.length) {
        setImages(imgs);
        setActiveImage(imgs[0].image_url);
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUser = userData.user;

      if (currentUser) {
        setUser(currentUser);

        const { data: savedData } = await supabase
          .from("saved_cars")
          .select("*")
          .eq("user_id", currentUser.id)
          .eq("car_id", id)
          .maybeSingle();

        setSaved(!!savedData);
      }

      if (carData?.seller_id) {
        const { data: sellerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", carData.seller_id)
          .single();

        setSeller(sellerData);
      }

      try {
        await (supabase as any).from("car_views").insert({ car_id: id });
      } catch {}

    };

    load();
  }, [id]);

  const toggleSave = async () => {
    if (!user) return alert("Login first");

    if (saved) {
      await supabase
        .from("saved_cars")
        .delete()
        .eq("car_id", id)
        .eq("user_id", user.id);
      setSaved(false);
    } else {
      await supabase
        .from("saved_cars")
        .insert({ car_id: id, user_id: user.id });
      setSaved(true);
    }
  };

  const contactSeller = async () => {
    if (!user) return alert("Login first");

    setChatLoading(true);

    const { data: existing } = await (supabase as any)
      .from("chat_conversations")
      .select("*")
      .eq("buyer_id", user.id)
      .eq("seller_id", car.seller_id)
      .eq("car_id", car.id)
      .maybeSingle();

    let convo = existing;

    if (!convo) {
      const { data } = await (supabase as any)
        .from("chat_conversations")
        .insert({
          buyer_id: user.id,
          seller_id: car.seller_id,
          car_id: car.id,
        })
        .select()
        .single();

      convo = data;
    }

    navigate(`/chat/${convo.id}`);
    setChatLoading(false);
  };

  if (!car) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10">

        {/* BACK */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-4 text-sm text-gray-600"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-10">

          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">

            {/* IMAGE */}
            <div className="relative">
              <img
                src={activeImage}
                className="w-full h-[250px] sm:h-[320px] lg:h-[420px] object-cover rounded-xl"
              />

              <button
                onClick={toggleSave}
                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow"
              >
                <Heart className={`w-5 h-5 ${saved ? "text-red-500 fill-red-500" : ""}`} />
              </button>
            </div>

            {/* THUMBNAILS */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {images.map((img: any) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  onClick={() => setActiveImage(img.image_url)}
                  className="h-20 w-28 object-cover rounded cursor-pointer border"
                />
              ))}
            </div>

            {/* TITLE + BADGES */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                {car.title}
              </h1>

              <div className="flex gap-2 mt-2 flex-wrap">
                {car.is_verified && (
                  <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded">
                    Verified
                  </span>
                )}

                {car.mileage < 20000 && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs rounded">
                    Low Mileage
                  </span>
                )}
              </div>

              <p className="text-2xl sm:text-3xl font-bold text-primary mt-2">
                ${Number(car.price).toLocaleString()}
              </p>

            </div>

            {/* QUICK SPECS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border rounded-xl p-4">
              <Spec icon={<Fuel />} label="Fuel" value={car.fuel_type} />
              <Spec icon={<Settings />} label="Gear" value={car.transmission} />
              <Spec icon={<Gauge />} label="Mileage" value={`${Number(car.mileage || 0).toLocaleString()} km`} />
              <Spec icon={<MapPin />} label="Location" value={car.location} />
            </div>

            {/* FULL DETAILS */}
            <div className="bg-white border rounded-xl p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <Detail label="Make" value={car.make} />
              <Detail label="Model" value={car.model} />
              <Detail label="Year" value={car.year} />
              <Detail label="Body Type" value={car.body_type} />
              <Detail label="Drivetrain" value={car.drivetrain} />
              <Detail label="Condition" value={car.condition} />
              <Detail label="Exterior Color" value={car.exterior_color} />
              <Detail label="Interior Color" value={car.interior_color} />
              <Detail label="VIN" value={car.vin} />
            </div>

            {/* DESCRIPTION */}
            <div className="bg-white border rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-gray-600">
                {car.description || "No description provided"}
              </p>
            </div>

          </div>

          {/* RIGHT */}
          <div className="space-y-4 lg:sticky lg:top-24">

            <div className="bg-white border rounded-xl p-4 sm:p-6 space-y-4">

              <Button className="w-full" onClick={contactSeller}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat with Seller
              </Button>

              <div className="border-t pt-4 space-y-3">

                <div className="flex items-center gap-3">
                  <img
                    src={seller?.avatar_url || "https://i.pravatar.cc/100"}
                    className="w-10 h-10 rounded-full"
                  />

                  <div>
                    <p className="font-semibold">
                      {seller?.full_name || "User"}
                    </p>

                    <p className="text-xs text-gray-500">
                      {seller?.is_verified ? "Verified Seller" : "Not Verified"}
                    </p>
                  </div>
                </div>

                {seller?.phone && (
                  <p className="text-sm text-gray-600">
                    📞 {seller.phone}
                  </p>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/seller/${car.seller_id}`)}
                >
                  View Seller Profile
                </Button>

              </div>

            </div>

          </div>

        </div>

      </div>

      {/* MOBILE CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-3 flex gap-3 lg:hidden">
        <Button className="w-1/2 min-w-0" onClick={toggleSave}>
          {saved ? "Saved ❤️" : "Save"}
        </Button>

        <Button className="w-1/2 min-w-0" onClick={contactSeller}>
          Chat
        </Button>
      </div>

      <Footer />
    </div>
  );
};

/* COMPONENTS */
const Detail = ({ label, value }: any) => (
  <div>
    <p className="text-gray-500 text-xs">{label}</p>
    <p className="font-medium">{value || "-"}</p>
  </div>
);

const Spec = ({ icon, label, value }: any) => (
  <div className="flex min-w-0 flex-col items-center text-center">
    <div className="mb-1 text-primary">{icon}</div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="break-words text-sm font-medium">{value || "-"}</p>
  </div>
);

export default CarDetail;
