import Breadcrumbs from "@/components/Breadcrumbs";
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
  SelectValue
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

const CreateListing = () => {

  const navigate = useNavigate();

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    make: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    location: "",
    transmission: "",
    fuel: "",
    description: ""
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  /* IMAGE UPLOAD */

  const uploadImages = async (files: FileList) => {

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Login required");
      return;
    }

    setUploading(true);

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {

      const filePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error } = await supabase.storage
        .from("vehicles")
        .upload(filePath, file);

      if (error) {
        toast.error(error.message);
        continue;
      }

      const { data } = supabase.storage
        .from("vehicles")
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);

    }

    setImages((prev) => [...prev, ...uploadedUrls]);

    setUploading(false);

  };

  const handleFileChange = (e: any) => {
    const files = e.target.files;
    if (!files) return;

    uploadImages(files);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  /* CREATE LISTING */

  const handleSubmit = async (e: any) => {

    e.preventDefault();

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    if (!form.title || !form.price) {
      toast.error("Please fill required fields");
      return;
    }

    /* CREATE CAR */

    const { data: car, error } = await (supabase as any)
      .from("cars")
      .insert({
        seller_id: user.id,
        title: form.title,
        make: form.make,
        model: form.model,
        year: form.year,
        price: form.price,
        mileage: form.mileage,
        location: form.location,
        transmission: form.transmission,
        fuel_type: form.fuel,
        description: form.description
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    /* SAVE IMAGES */

    if (images.length > 0) {

      const imageRows = images.map((url) => ({
        car_id: car.id,
        image_url: url
      }));

      await (supabase as any)
        .from("car_images")
        .insert(imageRows);

    }

    toast.success("Listing created successfully!");

    navigate("/dashboard");

  };

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-4xl mx-auto py-10 px-4">

        {/* BACK BUTTON */}

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-600 mb-6 hover:text-black"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <h1 className="text-2xl font-bold mb-2">
          Create New Listing
        </h1>

        <p className="text-gray-500 mb-8">
          Add your vehicle details and photos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">

          {/* PHOTO UPLOAD */}

          <div className="bg-white border rounded-xl p-6">

            <h2 className="font-semibold mb-4">
              Vehicle Photos
            </h2>

            <label className="border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">

              <UploadCloud className="h-10 w-10 text-gray-400 mb-3" />

              <p className="text-sm text-gray-500">
                Click or drag photos to upload
              </p>

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

            </label>

            {/* IMAGE GRID */}

            <div className="grid grid-cols-4 gap-4 mt-5">

              {images.map((img, i) => (

                <div key={i} className="relative">

                  <img
                    src={img}
                    className="w-full h-24 object-cover rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1"
                  >
                    <X size={14} />
                  </button>

                </div>

              ))}

            </div>

          </div>

          {/* VEHICLE DETAILS */}

          <div className="bg-white border rounded-xl p-6 space-y-4">

            <h2 className="font-semibold mb-4">
              Vehicle Details
            </h2>

            <div>
              <Label>Listing Title</Label>
              <Input
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="2022 Honda Civic"
              />
            </div>

            <div>
              <Label>Make</Label>
              <Input
                value={form.make}
                onChange={(e) => updateField("make", e.target.value)}
                placeholder="Toyota / BMW / Audi"
              />
            </div>

            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => updateField("model", e.target.value)}
                placeholder="Civic"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">

              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  value={form.year}
                  onChange={(e) => updateField("year", e.target.value)}
                />
              </div>

              <div>
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) => updateField("price", e.target.value)}
                />
              </div>

              <div>
                <Label>Mileage</Label>
                <Input
                  type="number"
                  value={form.mileage}
                  onChange={(e) => updateField("mileage", e.target.value)}
                />
              </div>

            </div>

            <div>
              <Label>Location</Label>
              <Input
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Toronto"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">

              <div>
                <Label>Transmission</Label>

                <Select
                  onValueChange={(v) => updateField("transmission", v)}
                >

                  <SelectTrigger>
                    <SelectValue placeholder="Transmission" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>

                </Select>

              </div>

              <div>
                <Label>Fuel Type</Label>

                <Select
                  onValueChange={(v) => updateField("fuel", v)}
                >

                  <SelectTrigger>
                    <SelectValue placeholder="Fuel type" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="gasoline">Gasoline</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>

                </Select>

              </div>

            </div>

            <div>
              <Label>Description</Label>

              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Describe vehicle condition and features..."
              />
            </div>

          </div>

          {/* SUBMIT */}

          <Button
            className="w-full h-12 text-lg"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Create Listing"}
          </Button>

        </form>

      </div>

      <Footer />

    </div>
  );
};

export default CreateListing;
