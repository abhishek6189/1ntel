import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FullscreenGallery from "@/components/FullscreenGallery";
import GlobalLoader from "@/components/GlobalLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { UploadCloud, ArrowLeft, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getImageUploadPath, prepareImageForUpload } from "@/utils/imageFiles";
import { consumeListingSlot, getListingAllowance } from "@/utils/listingAccess";

const PHOTO_SLOTS = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "right", label: "Right Side" },
  { key: "left", label: "Left Side" },
  { key: "cluster", label: "Cluster" },
  { key: "dashboard", label: "Dashboard" },
  { key: "interior", label: "Interior" },
];

export default function CreateListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") || searchParams.get("id");

  const [images, setImages] = useState<string[]>(Array(PHOTO_SLOTS.length).fill(""));
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [loadingListing, setLoadingListing] = useState(Boolean(editId));

  const [customFields, setCustomFields] = useState<any>({
    body_type: false,
    transmission: false,
    fuel_type: false,
    drivetrain: false,
    condition: false,
  });

  const [form, setForm] = useState<any>({
    title: "",
    make: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    location: "",
    transmission: "",
    fuel_type: "",
    body_type: "",
    drivetrain: "",
    exterior_color: "",
    interior_color: "",
    vin: "",
    condition: "",
    description: "",
    seller_phone: "",
  });

  const update = (field: string, value: string) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateNumber = (field: string, value: string) => {
    update(field, value.replace(/[^\d]/g, ""));
  };

  useEffect(() => {
    const loadListingForEdit = async () => {
      if (!editId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth?mode=login");
        return;
      }

      const { data: car, error } = await supabase
        .from("cars")
        .select("*, car_images(image_url, angle, sort_order)")
        .eq("id", editId)
        .eq("seller_id", user.id)
        .maybeSingle();

      if (error || !car) {
        toast.error("Listing not found or you do not have access.");
        navigate("/dashboard");
        return;
      }

      setForm({
        title: car.title || "",
        make: car.make || "",
        model: car.model || "",
        year: car.year ? String(car.year) : "",
        price: car.price ? String(car.price) : "",
        mileage: car.mileage ? String(car.mileage) : "",
        location: car.location || "",
        transmission: car.transmission || "",
        fuel_type: car.fuel_type || "",
        body_type: car.body_type || "",
        drivetrain: car.drivetrain || "",
        exterior_color: car.exterior_color || "",
        interior_color: car.interior_color || "",
        vin: car.vin || "",
        condition: car.condition || "",
        description: car.description || "",
        seller_phone: car.seller_phone || "",
      });
      const slotImages = Array(PHOTO_SLOTS.length).fill("");
      const sortedImages = [...(car.car_images || [])].sort((a: any, b: any) => {
        const aOrder = typeof a.sort_order === "number" ? a.sort_order : 999;
        const bOrder = typeof b.sort_order === "number" ? b.sort_order : 999;
        return aOrder - bOrder;
      });

      sortedImages.forEach((image: any, index: number) => {
        const slotIndex = typeof image.sort_order === "number"
          ? image.sort_order
          : PHOTO_SLOTS.findIndex((slot) => slot.key === image.angle);
        const targetIndex = slotIndex >= 0 && slotIndex < PHOTO_SLOTS.length ? slotIndex : index;

        if (targetIndex < PHOTO_SLOTS.length) {
          slotImages[targetIndex] = image.image_url || "";
        }
      });

      setImages(slotImages);
      setLoadingListing(false);
    };

    loadListingForEdit();
  }, [editId, navigate]);

  /* ================= PLAN LIMIT CHECK ================= */
  const checkPlanLimit = async (userId: string) => {
    const allowance = await getListingAllowance(userId);
    const access = allowance.access;

    if (!access.allowed) {
      toast.error(access.reason || "Please renew your subscription to list cars.");
      navigate("/pricing");
      return false;
    }

    if (!editId && !allowance.canCreate) {
      toast.error(
        allowance.needsCredit
          ? "Free listing limit reached. Buy an individual listing credit to add another car."
          : `Limit reached (${allowance.displayLimit}). Upgrade your plan.`
      );
      navigate("/pricing");
      return false;
    }

    return true;
  };

  useEffect(() => {
    const verifyListingAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await checkPlanLimit(user.id);
    };

    verifyListingAccess();
  }, []);

  /* ================= IMAGE UPLOAD ================= */
  const uploadImageForSlot = async (file: File, slotIndex: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login required");

    setUploading(true);
    setUploadProgress((prev) => ({ ...prev, [slotIndex]: 8 }));

    try {
      const uploadFile = await prepareImageForUpload(file);
      setUploadProgress((prev) => ({ ...prev, [slotIndex]: 35 }));
      const path = getImageUploadPath(user.id, uploadFile);

      const { error } = await supabase.storage
        .from("vehicles")
        .upload(path, uploadFile, {
          contentType: uploadFile.type,
        });

      if (error) {
        toast.error(error.message);
        return;
      }

      const { data } = supabase.storage.from("vehicles").getPublicUrl(path);
      setUploadProgress((prev) => ({ ...prev, [slotIndex]: 92 }));
      setImages((prev) => prev.map((image, index) => index === slotIndex ? data.publicUrl : image));
      setUploadProgress((prev) => ({ ...prev, [slotIndex]: 100 }));
    } finally {
      setTimeout(() => {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[slotIndex];
          return next;
        });
        setUploading(false);
      }, 350);
    }
  };

  const openImage = (index: number) => {
    const galleryImages = images.filter(Boolean);
    const selectedImage = images[index];
    const galleryIndex = Math.max(galleryImages.findIndex((image) => image === selectedImage), 0);

    setActiveImageIndex(galleryIndex);
    setGalleryOpen(true);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.map((image, imageIndex) => imageIndex === index ? "" : image));
    setActiveImageIndex((current) => Math.max(current - 1, 0));
    if (images.filter(Boolean).length <= 1) setGalleryOpen(false);
  };

  /* ================= ROLE BASED NAV ================= */
  const goToDashboard = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return navigate("/");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "dealer") {
      navigate("/dealer-dashboard");
    } else {
      navigate("/dashboard");
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e: any) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login required");

    const allowed = await checkPlanLimit(user.id);
    if (!allowed) return;

    if (!form.title || !form.make || !form.model || !form.price || !form.location || !String(form.vin || "").trim()) {
      return toast.error("Please fill all required fields, including VIN.");
    }

    const payload = {
      ...form,
      vin: String(form.vin || "").trim().toUpperCase(),
      year: form.year ? Number(form.year) : null,
      price: form.price ? Number(form.price) : null,
      mileage: form.mileage ? Number(form.mileage) : null,
      seller_id: user.id,
      status: "active",
    };

    const { data, error } = editId
      ? await supabase
          .from("cars")
          .update(payload)
          .eq("id", editId)
          .eq("seller_id", user.id)
          .select()
          .single()
      : await supabase
          .from("cars")
          .insert(payload)
          .select()
          .single();

    if (error) return toast.error(error.message);

    if (!editId) {
      const allowance = await getListingAllowance(user.id);
      const plan = String(allowance.access.plan || "").toLowerCase();

      if (plan !== "garage" && plan !== "dealer") {
        try {
          await consumeListingSlot(user.id);
        } catch (slotError: any) {
          await supabase.from("cars").delete().eq("id", data.id);
          return toast.error(slotError?.message || "Listing limit reached.");
        }
      }
    }

    if (editId) {
      await supabase.from("car_images").delete().eq("car_id", data.id);
    }

    const filledImages = images
      .map((image, index) => ({ image, index }))
      .filter((item) => Boolean(item.image));

    if (filledImages.length) {
      await supabase.from("car_images").insert(
        filledImages.map(({ image, index }) => ({
          car_id: data.id,
          image_url: image,
          angle: PHOTO_SLOTS[index].key,
          sort_order: index,
        }))
      );
    }

    toast.success("Car Listed Successfully");

    /* ✅ FIXED REDIRECT */
    await goToDashboard();
  };

  const dropdowns = [
    {
      label: "Body Type",
      field: "body_type",
      options: ["Sedan","SUV","Truck","Coupe","Hatchback","Van","Convertible","Wagon","Other"]
    },
    {
      label: "Transmission",
      field: "transmission",
      options: ["Automatic","Manual","CVT","Other"]
    },
    {
      label: "Fuel Type",
      field: "fuel_type",
      options: ["Gasoline","Diesel","Electric","Hybrid","Plug-in Hybrid","Other"]
    },
    {
      label: "Drivetrain",
      field: "drivetrain",
      options: ["FWD","RWD","AWD","4WD","Other"]
    }
  ];

  if (loadingListing) {
    return <GlobalLoader className="min-h-screen" />;
  }

  const galleryImages = images.filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-4">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold">
            {editId ? "Edit Listing" : "List a New Car"}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl border space-y-6">

          {/* IMAGES */}
          <div>
            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Label>Photos</Label>
                <p className="text-sm text-gray-500">
                  Upload each required angle in this order.
                </p>
              </div>
              <p className="text-xs font-medium text-gray-500">
                {galleryImages.length}/{PHOTO_SLOTS.length} uploaded
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {PHOTO_SLOTS.map((slot, i) => {
                const img = images[i];
                const progress = uploadProgress[i];
                const isSlotUploading = typeof progress === "number";

                return (
                <div
                  key={slot.key}
                  className="group relative overflow-hidden rounded-xl border bg-gray-50"
                >
                  {img ? (
                    <button
                      type="button"
                      onClick={() => openImage(i)}
                      className="block aspect-[5/3] w-full"
                      aria-label={`Open ${slot.label} photo`}
                    >
                      <img src={img} className="h-full w-full object-cover" alt={`${slot.label} car photo`} />
                    </button>
                  ) : (
                    <label className={`flex aspect-[5/3] w-full flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-center transition ${
                      isSlotUploading
                        ? "cursor-wait bg-blue-50/50"
                        : "cursor-pointer hover:border-blue-300 hover:bg-blue-50/40"
                    }`}>
                      {isSlotUploading ? (
                        <>
                          <div className="h-10 w-10 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                          <span className="text-sm font-semibold text-blue-700">
                            Uploading {progress}%
                          </span>
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-blue-100">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-6 w-6 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Upload {slot.label}</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,.heic,.heif"
                        hidden
                        disabled={isSlotUploading}
                        onChange={(e: any) => {
                          const file = e.target.files?.[0];
                          if (file) uploadImageForSlot(file, i);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t bg-white px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{i + 1}. {slot.label}</p>
                      <p className="text-xs text-gray-500">{img ? "Photo added" : "Required angle"}</p>
                    </div>

                    {img && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => openImage(i)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
                          aria-label={`View ${slot.label} photo`}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                          aria-label={`Delete ${slot.label} photo`}
                    >
                          <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* BASIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title *" placeholder="2022 Honda Civic EX" value={form.title} onChange={(v)=>update("title",v)} />
            <Field label="Make *" placeholder="Honda" value={form.make} onChange={(v)=>update("make",v)} />
            <Field label="Model *" placeholder="Civic" value={form.model} onChange={(v)=>update("model",v)} />
            <Field label="Year *" type="number" placeholder="2022" value={form.year} onChange={(v)=>update("year",v)} />
            <NumberField label="Price ($) *" placeholder="28,500" value={form.price} onChange={(v)=>updateNumber("price",v)} />
            <NumberField label="Mileage (km)" placeholder="32,000" value={form.mileage} onChange={(v)=>updateNumber("mileage",v)} />
            <Field label="Location *" placeholder="Toronto, ON" value={form.location} onChange={(v)=>update("location",v)} />
            <Field label="Phone" placeholder="(416) 555-0123" value={form.seller_phone} onChange={(v)=>update("seller_phone",v)} />
          </div>

          {/* DROPDOWNS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dropdowns.map((item) => (
              <div key={item.field}>
                <Label>{item.label}</Label>

                <Select
                  value={form[item.field] || undefined}
                  onValueChange={(value) => {
                    update(item.field, value);
                    setCustomFields((prev:any)=>({...prev,[item.field]:value==="other"}));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${item.label}`} />
                  </SelectTrigger>

                  <SelectContent>
                    {item.options.map((o) => (
                      <SelectItem key={o} value={o.toLowerCase()}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {customFields[item.field] && (
                  <Input
                    className="mt-2"
                    placeholder={`Enter ${item.label}`}
                    onChange={(e)=>update(item.field,e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* COLORS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Exterior Color" placeholder="Black" value={form.exterior_color} onChange={(v)=>update("exterior_color",v)} />
            <Field label="Interior Color" placeholder="Beige" value={form.interior_color} onChange={(v)=>update("interior_color",v)} />
          </div>

          {/* CONDITION */}
          <div>
            <Label>Condition</Label>
            <Select value={form.condition || undefined} onValueChange={(value)=>{
              update("condition",value);
              setCustomFields((prev:any)=>({...prev,condition:value==="other"}));
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select Condition" />
              </SelectTrigger>
              <SelectContent>
                {["Excellent","Good","Fair","Poor","Other"].map(i=>(
                  <SelectItem key={i} value={i.toLowerCase()}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {customFields.condition && (
              <Input className="mt-2" placeholder="Enter Condition" onChange={(e)=>update("condition",e.target.value)} />
            )}
          </div>

          {/* EXTRA */}
          <Field label="VIN *" placeholder="Vehicle Identification Number" value={form.vin} onChange={(v)=>update("vin",v.toUpperCase())} required />

          <div>
            <Label>Description</Label>
            <Textarea value={form.description} placeholder="Describe your vehicle..." onChange={(e)=>update("description",e.target.value)} />
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" className="w-full sm:w-auto" disabled={uploading}>
              {uploading ? "Uploading..." : editId ? "Update Listing" : "Create Listing"}
            </Button>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={goToDashboard}
            >
              Cancel
            </Button>
          </div>

        </form>
      </div>

      <Footer />

      {galleryOpen && (
        <FullscreenGallery
          images={galleryImages}
          current={activeImageIndex}
          setCurrent={setActiveImageIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}

/* REUSABLE FIELD */
const Field = ({ label, placeholder, type="text", value = "", onChange, required = false }: any) => (
  <div>
    <Label>{label}</Label>
    <Input type={type} value={value} placeholder={placeholder} required={required} onChange={(e)=>onChange(e.target.value)} />
  </div>
);

const formatNumber = (value: string) => {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
};

const NumberField = ({ label, placeholder, value, onChange }: any) => (
  <div>
    <Label>{label}</Label>
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={formatNumber(value)}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);
