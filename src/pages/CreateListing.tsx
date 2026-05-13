import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
import { UploadCloud, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CreateListing() {
  const navigate = useNavigate();

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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

  /* ================= PLAN LIMIT CHECK ================= */
  const checkPlanLimit = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single();

    const PLAN_LIMITS: any = {
      free: 2,
      garage: 10,
      dealer: 35,
    };

    const plan = profile?.plan || "free";
    const limit = PLAN_LIMITS[plan];

    const { count } = await supabase
      .from("cars")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", userId);

    if ((count || 0) >= limit) {
      toast.error(`Limit reached (${limit}). Upgrade your plan 🚀`);
      navigate("/pricing");
      return false;
    }

    return true;
  };

  /* ================= IMAGE UPLOAD ================= */
  const uploadImages = async (files: FileList) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Login required");

    setUploading(true);

    for (const file of Array.from(files)) {
      const path = `${user.id}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("vehicles")
        .upload(path, file);

      if (error) {
        toast.error(error.message);
        continue;
      }

      const { data } = supabase.storage.from("vehicles").getPublicUrl(path);
      setImages((prev) => [...prev, data.publicUrl]);
    }

    setUploading(false);
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

    if (!form.title || !form.make || !form.model || !form.price || !form.location) {
      return toast.error("Please fill all required fields");
    }

    const { data, error } = await supabase
      .from("cars")
      .insert({
        ...form,
        seller_id: user.id,
        status: "active",
      })
      .select()
      .single();

    if (error) return toast.error(error.message);

    if (images.length) {
      await supabase.from("car_images").insert(
        images.map((img) => ({
          car_id: data.id,
          image_url: img,
        }))
      );
    }

    toast.success("Car Listed Successfully 🚀");

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto py-6 sm:py-10 px-3 sm:px-4">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl font-semibold">List a New Car</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-xl border space-y-6">

          {/* IMAGES */}
          <div>
            <Label>Photos</Label>
            <label className="border-2 border-dashed p-6 sm:p-8 flex flex-col items-center cursor-pointer rounded-lg">
              <UploadCloud className="h-8 w-8 text-gray-400" />
              <span className="text-sm text-gray-500">Click to upload</span>
              <input type="file" multiple hidden onChange={(e:any)=>uploadImages(e.target.files)} />
            </label>

            <div className="flex gap-3 mt-4 flex-wrap">
              {images.map((img, i) => (
                <img key={i} src={img} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border" />
              ))}
            </div>
          </div>

          {/* BASIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title *" placeholder="2022 Honda Civic EX" onChange={(v)=>update("title",v)} />
            <Field label="Make *" placeholder="Honda" onChange={(v)=>update("make",v)} />
            <Field label="Model *" placeholder="Civic" onChange={(v)=>update("model",v)} />
            <Field label="Year *" type="number" placeholder="2022" onChange={(v)=>update("year",v)} />
            <NumberField label="Price ($) *" placeholder="28,500" value={form.price} onChange={(v)=>updateNumber("price",v)} />
            <NumberField label="Mileage (km)" placeholder="32,000" value={form.mileage} onChange={(v)=>updateNumber("mileage",v)} />
            <Field label="Location *" placeholder="Toronto, ON" onChange={(v)=>update("location",v)} />
            <Field label="Phone" placeholder="(416) 555-0123" onChange={(v)=>update("seller_phone",v)} />
          </div>

          {/* DROPDOWNS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {dropdowns.map((item) => (
              <div key={item.field}>
                <Label>{item.label}</Label>

                <Select
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
            <Field label="Exterior Color" placeholder="Black" onChange={(v)=>update("exterior_color",v)} />
            <Field label="Interior Color" placeholder="Beige" onChange={(v)=>update("interior_color",v)} />
          </div>

          {/* CONDITION */}
          <div>
            <Label>Condition</Label>
            <Select onValueChange={(value)=>{
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
          <Field label="VIN" placeholder="Vehicle Identification Number" onChange={(v)=>update("vin",v)} />

          <div>
            <Label>Description</Label>
            <Textarea placeholder="Describe your vehicle..." onChange={(e)=>update("description",e.target.value)} />
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" className="w-full sm:w-auto">
              {uploading ? "Uploading..." : "Create Listing"}
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
    </div>
  );
}

/* REUSABLE FIELD */
const Field = ({ label, placeholder, type="text", onChange }: any) => (
  <div>
    <Label>{label}</Label>
    <Input type={type} placeholder={placeholder} onChange={(e)=>onChange(e.target.value)} />
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
