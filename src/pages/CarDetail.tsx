import BackButton from "@/components/BackButton";
import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import FullscreenGallery from "@/components/FullscreenGallery";
import {
ShieldCheck,
Lock,
ArrowLeft,
Phone,
ChevronLeft,
ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

const statusConfig: any = {
none: { label: "Not Inspected", color: "bg-secondary text-secondary-foreground" },
pending: { label: "Inspection Pending", color: "bg-yellow-100 text-yellow-600" },
passed: { label: "Verified ✓", color: "bg-green-600 text-white" },
passed_with_issues: { label: "Verified (Minor Issues)", color: "bg-yellow-100 text-yellow-600" },
failed: { label: "Failed Inspection", color: "bg-red-100 text-red-600" }
};

const CarDetail = () => {

const { id } = useParams();

const [car, setCar] = useState<any>(null);
const [images, setImages] = useState<any[]>([]);
const [activeImage, setActiveImage] = useState("");
const [loading, setLoading] = useState(true);

const [galleryOpen, setGalleryOpen] = useState(false);
const [currentIndex, setCurrentIndex] = useState(0);

useEffect(() => {


const fetchCar = async () => {

  const { data } = await (supabase as any)
    .from("cars")
    .select("*")
    .eq("id", id)
    .single();

  if (data) {
    setCar(data);
  }

  const { data: imgData } = await (supabase as any)
    .from("car_images")
    .select("*")
    .eq("car_id", id);

  if (imgData && imgData.length > 0) {
    setImages(imgData);
    setActiveImage(imgData[0].image_url);
  } else if (data?.image_url) {
    setActiveImage(data.image_url);
  }

  setLoading(false);
};

fetchCar();


}, [id]);

const nextImage = () => {


if (images.length === 0) return;

const index = images.findIndex(i => i.image_url === activeImage);
const next = (index + 1) % images.length;

setActiveImage(images[next].image_url);


};

const prevImage = () => {


if (images.length === 0) return;

const index = images.findIndex(i => i.image_url === activeImage);
const prev = (index - 1 + images.length) % images.length;

setActiveImage(images[prev].image_url);


};

if (loading) {


return (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-20 text-center">
      Loading vehicle...
    </div>
    <Footer />
  </div>
);


}

if (!car) {


return (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-20 text-center">
      Vehicle not found
    </div>
    <Footer />
  </div>
);


}

const status = statusConfig[car.inspection_status] || statusConfig["none"];

const contactUnlocked =
car.inspection_status === "passed" ||
car.inspection_status === "passed_with_issues";

return (


<div className="min-h-screen">

  <Navbar />

  <div className="container py-8 max-w-6xl">

    <Link
      to="/browse"
      className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
    >
      <ArrowLeft size={16}/>
      Back to Browse
    </Link>

    <motion.div
      initial={{opacity:0,y:20}}
      animate={{opacity:1,y:0}}
    >

      {/* IMAGE GALLERY */}

      <div className="mb-8">

        <div className="relative rounded-xl overflow-hidden bg-gray-100">

          <Zoom>
            <img
              src={
                activeImage ||
                "https://images.unsplash.com/photo-1503376780353-7e6692767b70"
              }
              loading="lazy"
              onClick={() => {
                const index = images.findIndex(i => i.image_url === activeImage);
                setCurrentIndex(index >= 0 ? index : 0);
                setGalleryOpen(true);
              }}
              className="w-full h-[420px] object-cover cursor-zoom-in"
            />
          </Zoom>

          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
              >
                <ChevronLeft/>
              </button>

              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
              >
                <ChevronRight/>
              </button>
            </>
          )}

          {/* IMAGE COUNTER */}
          {images.length > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded">
              {images.findIndex(i => i.image_url === activeImage) + 1} / {images.length}
            </div>
          )}

        </div>

        {/* THUMBNAILS */}

        {images.length > 1 && (

          <div className="flex gap-3 mt-3 overflow-x-auto">

            {images.map((img:any)=>(
              <img
                key={img.id}
                src={img.image_url}
                onClick={()=>setActiveImage(img.image_url)}
                className={`h-20 w-28 object-cover rounded cursor-pointer border ${
                  activeImage === img.image_url
                  ? "border-blue-500"
                  : "border-transparent"
                }`}
              />
            ))}

          </div>

        )}

      </div>

      <div className="grid md:grid-cols-3 gap-8">

        {/* MAIN INFO */}

        <div className="md:col-span-2 space-y-6">

          <div>

            <Badge className={status.color}>
              {status.label}
            </Badge>

            <h1 className="text-3xl font-bold mt-2">
              {car.title}
            </h1>

            <p className="text-3xl font-bold text-primary">
              ${Number(car.price).toLocaleString()}
            </p>

          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Year</p>
              <p className="font-semibold">{car.year}</p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Mileage</p>
              <p className="font-semibold">
                {Number(car.mileage).toLocaleString()} km
              </p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="font-semibold">{car.location}</p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Fuel</p>
              <p className="font-semibold">{car.fuel_type}</p>
            </div>

            <div className="glass p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Transmission</p>
              <p className="font-semibold">{car.transmission}</p>
            </div>

          </div>

          {car.description && (

            <div>

              <h2 className="font-semibold text-lg mb-2">
                Description
              </h2>

              <p className="text-muted-foreground">
                {car.description}
              </p>

            </div>

          )}

        </div>

        {/* SIDEBAR */}

        <div>

          <div className="glass rounded-xl p-6">

            <h3 className="font-semibold mb-4">
              Seller Information
            </h3>

            {contactUnlocked ? (

              <Button className="w-full">
                <Phone className="mr-2 h-4 w-4"/>
                Contact Seller
              </Button>

            ) : (

              <div className="space-y-4">

                <div className="flex items-center gap-2 text-muted-foreground">
                  <Lock size={16}/>
                  Contact locked until inspection
                </div>

                <Button
                  className="w-full"
                  onClick={async()=>{

                    const {data:{user}} = await supabase.auth.getUser()

                    if(!user){
                      alert("Please login")
                      return
                    }

                    const {error} = await (supabase as any)
                      .from("inspection_requests")
                      .insert({
                        car_id:car.id,
                        buyer_id:user.id
                      })

                    if(error){
                      alert("Failed request")
                      return
                    }

                    alert("Inspection requested!")

                  }}
                >
                  <ShieldCheck className="mr-2 h-4 w-4"/>
                  Request Inspection ($50)
                </Button>

              </div>

            )}

          </div>

        </div>

      </div>

    </motion.div>

    {/* FULLSCREEN GALLERY */}

    {galleryOpen && (
      <FullscreenGallery
        images={images.map(i => i.image_url)}
        current={currentIndex}
        setCurrent={setCurrentIndex}
        onClose={() => setGalleryOpen(false)}
      />
    )}

  </div>

  <Footer />

</div>


);
};

export default CarDetail;
