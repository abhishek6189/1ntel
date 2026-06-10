import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FullscreenGallery from "@/components/FullscreenGallery";
import GlobalLoader from "@/components/GlobalLoader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { FALLBACK_AVATAR_URL } from "@/utils/imageFiles";
import { toast } from "sonner";
import { filterVisibleCarsForPublic } from "@/utils/subscriptionAccess";
import SEO, { SITE_URL } from "@/components/SEO";

import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Fuel,
  Settings,
  Gauge,
  MapPin,
  Images,
  Info,
  ShieldCheck,
  Crown,
} from "lucide-react";

const formatPlanName = (plan?: string) => {
  const normalized = String(plan || "free").toLowerCase();

  if (normalized === "free") return "Free Plan";
  if (normalized === "individual") return "Individual Plan";
  if (normalized === "garage") return "Garage Plan";
  if (normalized === "dealer") return "Dealer Plan";

  return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Plan`;
};

const isDealerProfile = (seller: any) =>
  String(seller?.role || "").toLowerCase() === "dealer" ||
  String(seller?.plan || "").toLowerCase() === "dealer";

const CarDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [car, setCar] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [activeImage, setActiveImage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);

  const [chatLoading, setChatLoading] = useState(false);
  const [inspectionRequested, setInspectionRequested] = useState(false);
  const [inspectionSoonOpen, setInspectionSoonOpen] = useState(false);

  useEffect(() => {
    const inspectionStatus = searchParams.get("inspection");

    if (inspectionStatus === "success") {
      toast.success("Payment successful. Your inspection request has been submitted.");
      setInspectionRequested(true);
    }

    if (inspectionStatus === "cancelled") {
      toast.info("Inspection payment was cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      const { data: carData } = await supabase
        .from("cars")
        .select("*")
        .eq("id", id)
        .single();

      if (!carData) return;

      const [visibleCar] = await filterVisibleCarsForPublic([carData]);
      if (!visibleCar || (carData.status && carData.status !== "active")) {
        toast.error("This listing is not available right now.");
        navigate("/browse", { replace: true });
        return;
      }

      setCar(carData);
      setActiveImage(carData.image_url || "");

      const { data: imgs } = await supabase
        .from("car_images")
        .select("*")
        .eq("car_id", id)
        .order("sort_order", { ascending: true });

      if (imgs?.length) {
        setImages(imgs);
        setActiveImage(imgs[0].image_url);
        setActiveImageIndex(0);
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

        const inspectionResult = await (supabase as any)
          .from("inspection_requests")
          .select("id")
          .eq("buyer_id", currentUser.id)
          .eq("car_id", id)
          .maybeSingle();
        let existingInspection = inspectionResult.data;
        const existingInspectionError = inspectionResult.error;

        if (existingInspectionError?.message?.includes("car_id")) {
          const fallback = await (supabase as any)
            .from("inspection_requests")
            .select("id")
            .eq("buyer_id", currentUser.id)
            .eq("listing_id", id)
            .maybeSingle();

          existingInspection = fallback.data;
        }

        setInspectionRequested(!!existingInspection);
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

  const requestInspection = () => {
    setInspectionSoonOpen(true);
  };

  if (!car) return <GlobalLoader className="min-h-screen" />;

  const galleryImages = images.map((img: any) => img.image_url).filter(Boolean);
  const displayImages = galleryImages.length ? galleryImages : activeImage ? [activeImage] : [];
  const carTitle = `${car.year || ""} ${car.make || ""} ${car.model || car.title || "Used Car"}`.replace(/\s+/g, " ").trim();
  const carDescription = `${carTitle} for sale in ${car.location || "Canada"} for $${Number(car.price || 0).toLocaleString()}. View mileage, fuel type, photos, and seller details on 1ntel.`;

  const selectImage = (index: number) => {
    const nextImage = displayImages[index];
    if (!nextImage) return;

    setActiveImage(nextImage);
    setActiveImageIndex(index);
  };

  const openGallery = (index = activeImageIndex) => {
    if (!displayImages.length) return;

    selectImage(index);
    setGalleryOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 lg:pb-0">
      <SEO
        title={`${carTitle} for Sale`}
        description={carDescription}
        path={`/car/${car.id}`}
        image={displayImages[0] || "/logo.png"}
        type="product"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Vehicle",
          name: carTitle,
          url: `${SITE_URL}/car/${car.id}`,
          image: displayImages,
          brand: car.make,
          model: car.model,
          vehicleModelDate: car.year ? String(car.year) : undefined,
          mileageFromOdometer: car.mileage
            ? {
                "@type": "QuantitativeValue",
                value: Number(car.mileage),
                unitCode: "KMT",
              }
            : undefined,
          offers: {
            "@type": "Offer",
            price: Number(car.price || 0),
            priceCurrency: "CAD",
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/car/${car.id}`,
          },
        }}
      />
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
            <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm">
              <button
                type="button"
                onClick={() => openGallery()}
                className="group block w-full"
                aria-label="Open vehicle photo gallery"
              >
                <img
                  src={activeImage}
                  alt={car.title}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="h-[280px] w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-[360px] lg:h-[460px]"
                />
              </button>

              <button
                onClick={toggleSave}
                className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/95 shadow-lg backdrop-blur"
                aria-label={saved ? "Remove from saved cars" : "Save car"}
              >
                <Heart className={`w-5 h-5 ${saved ? "text-red-500 fill-red-500" : ""}`} />
              </button>

              {displayImages.length > 1 && (
                <button
                  type="button"
                  onClick={() => openGallery()}
                  className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-sm font-medium text-white shadow-lg backdrop-blur"
                >
                  <Images className="h-4 w-4" />
                  {activeImageIndex + 1} / {displayImages.length}
                </button>
              )}
            </div>

            {/* THUMBNAILS */}
            {displayImages.length > 1 && (
              <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                <div className="flex gap-2.5 sm:gap-3">
                  {displayImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => selectImage(index)}
                      onDoubleClick={() => openGallery(index)}
                      className={`relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white shadow-sm transition sm:h-20 sm:w-28 ${
                        index === activeImageIndex
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                      aria-label={`Show vehicle photo ${index + 1}`}
                    >
                      <img
                        src={image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TITLE + BADGES */}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">
                {car.title}
              </h1>

              <div className="flex gap-2 mt-2 flex-wrap">
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
              <Spec icon={<Settings />} label="Transmission" value={car.transmission} />
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

              <Button
                variant="outline"
                className="w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                onClick={requestInspection}
              >
                <ShieldCheck className="mr-2 h-4 w-4" />
                Request Inspection
              </Button>

              <div className="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <p>
                  1ntel can inspect this car before you buy and share a report
                  with our recommendation. Inspection fee: $50, non-refundable.
                </p>
              </div>

              <div className="border-t pt-4 space-y-3">

                <div className="flex items-center gap-3">
                  <img
                    src={seller?.avatar_url || FALLBACK_AVATAR_URL}
                    className="w-10 h-10 rounded-full"
                    loading="lazy"
                    decoding="async"
                  />

                  <div>
                    <p className="font-semibold">
                      {seller?.full_name || "User"}
                    </p>

                    {isDealerProfile(seller) ? (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-[#00357a]/20 bg-[#00357a]/10 px-2 py-0.5 text-xs font-semibold text-[#00357a]">
                        <Crown className="h-3 w-3 fill-current" />
                        Dealer
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {formatPlanName(seller?.plan)}
                      </p>
                    )}
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
      <div className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-3 gap-2 border-t bg-white p-3 lg:hidden">
        <Button className="min-w-0 px-2" onClick={toggleSave}>
          {saved ? "Saved ❤️" : "Save"}
        </Button>

        <Button className="min-w-0 px-2" onClick={contactSeller}>
          Chat
        </Button>

        <Button
          className="min-w-0 px-2"
          variant="outline"
          onClick={requestInspection}
        >
          Inspect
        </Button>
      </div>

      <Footer />

      <Dialog open={inspectionSoonOpen} onOpenChange={setInspectionSoonOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Inspection coming soon
            </DialogTitle>
            <DialogDescription>
              This feature is coming soon.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setInspectionSoonOpen(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>

      {galleryOpen && (
        <FullscreenGallery
          images={displayImages}
          current={activeImageIndex}
          setCurrent={selectImage}
          onClose={() => setGalleryOpen(false)}
        />
      )}
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
