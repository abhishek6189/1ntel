import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Heart, MessageCircle } from "lucide-react";

const CarDetail = () => {

  const { id } = useParams();
  const navigate = useNavigate();

  const [car, setCar] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [activeImage, setActiveImage] = useState("");

  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  const [seller, setSeller] = useState<any>(null);
  const [views, setViews] = useState(0);

  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {

    const load = async () => {

      if (!id) return;

      /* CAR */
      const { data: carData } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (!carData) return;

      setCar(carData);

      /* IMAGES */
      const { data: imgs } = await supabase
        .from("car_images")
        .select("*")
        .eq("car_id", id);

      if (imgs?.length) {
        setImages(imgs);
        setActiveImage(imgs[0].image_url);
      } else {
        setActiveImage(carData.image_url);
      }

      /* USER */
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

        const { data: inspection } = await supabase
          .from("inspection_requests")
          .select("*")
          .eq("buyer_id", currentUser.id)
          .eq("car_id", id)
          .maybeSingle();

        setAlreadyRequested(!!inspection);
      }

      /* SELLER */
      if (carData?.seller_id) {
        const { data: sellerData } = await supabase
          .from("profiles")
          .select("full_name, email, phone, is_verified")
          .eq("id", carData.seller_id)
          .single();

        setSeller(sellerData);
      }

      /* VIEWS */
      try {
        await (supabase as any).from("car_views").insert({ car_id: id });
      } catch {}

      try {
        const { count } = await (supabase as any)
          .from("car_views")
          .select("*", { count: "exact", head: true })
          .eq("car_id", id);

        setViews(count || 0);
      } catch {}
    };

    load();

  }, [id]);

  /* SAVE */
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

  /* INSPECTION */
  const requestInspection = async () => {
    if (!user) return alert("Login first");
    if (alreadyRequested) return;

    await supabase.from("inspection_requests").insert({
      car_id: id,
      buyer_id: user.id
    });

    setAlreadyRequested(true);
  };

  /* CHAT SYSTEM (FINAL FIXED) */
  const contactSeller = async () => {

    if (!user) {
      alert("Please login first");
      return;
    }

    if (!car?.seller_id) {
      alert("Seller not available");
      return;
    }

    if (!car?.id) {
      alert("Invalid car");
      return;
    }

    setChatLoading(true);

    try {

      /* CHECK EXISTING */
      const { data: existing, error } = await (supabase as any)
        .from("chat_conversations")
        .select("*")
        .eq("buyer_id", user.id)
        .eq("seller_id", car.seller_id)
        .eq("car_id", car.id)
        .maybeSingle();

      if (error) throw error;

      let convo = existing;

      /* CREATE NEW */
      if (!convo) {
        const { data: newConvo, error: insertError } = await (supabase as any)
          .from("chat_conversations")
          .insert({
            buyer_id: user.id,
            seller_id: car.seller_id,
            car_id: car.id
          })
          .select()
          .single();

        if (insertError) throw insertError;

        convo = newConvo;
      }

      /* NAVIGATE */
      navigate(`/chat/${convo.id}`);

    } catch (err: any) {
      console.error("CHAT ERROR:", err);
      alert(err.message || "Failed to start chat");
    } finally {
      setChatLoading(false);
    }
  };

  if (!car) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="min-h-screen">

      <Navbar />

      <div className="container py-8 max-w-7xl">

        <Link to="/browse" className="flex items-center gap-2 mb-6">
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="grid lg:grid-cols-3 gap-10">

          {/* LEFT */}
          <div className="lg:col-span-2">

            <div className="relative">
              <img
                src={activeImage}
                className="w-full h-[420px] object-cover rounded-xl"
              />

              <button
                onClick={toggleSave}
                className="absolute top-4 right-4 bg-white p-2 rounded-full shadow"
              >
                <Heart className={`w-5 h-5 ${saved ? "text-red-500 fill-red-500" : ""}`} />
              </button>
            </div>

            <div className="flex gap-3 mt-3 overflow-x-auto">
              {images.map((img: any) => (
                <img
                  key={img.id}
                  src={img.image_url}
                  onClick={() => setActiveImage(img.image_url)}
                  className="h-20 w-28 object-cover rounded cursor-pointer border"
                />
              ))}
            </div>

            <div className="mt-6">
              <h1 className="text-3xl font-bold">{car.title}</h1>

              <p className="text-3xl text-primary font-bold mt-2">
                ${Number(car.price).toLocaleString()}
              </p>

              <p className="text-sm text-orange-500 mt-2">
                🔥 {views} total views
              </p>
            </div>

          </div>

          {/* RIGHT */}
          <div className="sticky top-24 h-fit">

            <div className="glass p-6 rounded-xl space-y-4">

              <Button onClick={requestInspection} disabled={alreadyRequested}>
                {alreadyRequested ? "Inspection Requested" : "Request Inspection ($50)"}
              </Button>

              <Button onClick={contactSeller} disabled={chatLoading}>
                <MessageCircle className="mr-2 h-4 w-4" />
                {chatLoading ? "Opening Chat..." : "Chat with Seller"}
              </Button>

              <div className="border-t pt-4 text-sm">
                <p className="font-semibold">{seller?.full_name}</p>
                <p>{seller?.email}</p>
                <p>
                  {seller?.is_verified ? "✅ Verified Dealer" : "Not Verified"}
                </p>
              </div>

            </div>

          </div>

        </div>

      </div>

      <Footer />

    </div>
  );
};

export default CarDetail;