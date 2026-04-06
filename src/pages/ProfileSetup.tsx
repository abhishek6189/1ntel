import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import heic2any from "heic2any";
import imageCompression from "browser-image-compression";
import { useDropzone } from "react-dropzone";
import Cropper from "react-easy-crop";
import { useProfile } from "@/context/ProfileContext";

export default function ProfileSetup() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useProfile();

  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState(0);

  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");

  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 🔥 Crop States
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<any>(null);

  /* ================= DROPZONE ================= */
  const onDrop = useCallback(async (acceptedFiles: any) => {
  const file = acceptedFiles[0];
  if (!file) return;

  try {
    const processed = await processImage(file);

    const url = URL.createObjectURL(processed);
    setCropImage(url);

  } catch (err) {
    console.log(err);
  }
}, []);

const { getRootProps, getInputProps } = useDropzone({
  onDrop,
  multiple: false,
  accept: {
    "image/*": [],
    "image/heic": [],
    "image/heif": []
  }
});

  /* ================= IMAGE PROCESS ================= */
  const processImage = async (file: File) => {
  let finalFile = file;

  try {
    // ✅ HEIC → JPG FIX (IMPORTANT)
    if (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic")
    ) {
      const converted: any = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      });

      // 🔥 HANDLE ARRAY CASE
      const blob = Array.isArray(converted) ? converted[0] : converted;

      finalFile = new File([blob], "converted.jpg", {
        type: "image/jpeg",
      });
    }

    // ✅ Compress
    finalFile = await imageCompression(finalFile, {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 800,
      useWebWorker: true,
    });

    return finalFile;

  } catch (err) {
    console.error("HEIC conversion error:", err);
    toast.error("HEIC not supported, try JPG/PNG");
    throw err;
  }
};

  /* ================= LOAD USER ================= */
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) return;

      setUser(currentUser);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profile?.profile_completed) {
        navigate("/dashboard");
      }

      setUsername(profile?.full_name || "");
      setPhone(profile?.phone || "");
      setAvatar(profile?.avatar_url || "");

      if (!profile?.avatar_url && currentUser.user_metadata?.avatar_url) {
        setAvatar(currentUser.user_metadata.avatar_url);
        setPreview(currentUser.user_metadata.avatar_url);
      }
    };

    loadUser();
  }, []);

  /* ================= UPLOAD ================= */
 const uploadAvatar = async (file: File) => {
    setLoading(true);
    setUploadProgress(10);

    try {
      const processed = await processImage(file);

      setUploadProgress(40);
      setPreview(URL.createObjectURL(processed));

      const filePath = `${user.id}/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from("avtars")
        .upload(filePath, processed);

      if (error) throw error;

      setUploadProgress(80);

      const { data } = supabase.storage
        .from("avtars")
        .getPublicUrl(filePath);

      setAvatar(data.publicUrl);

      // ✅ MAIN FIX
      await refreshProfile();

      setUploadProgress(100);
      toast.success("Photo uploaded 🚀");

    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
    setTimeout(() => setUploadProgress(0), 1200);
  };

  /* ================= FINAL SAVE ================= */
  const finishSetup = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: username,
        phone,
        avatar_url: avatar,
        profile_completed: true,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) return toast.error(error.message);

    // ✅ IMPORTANT
    await refreshProfile();

    toast.success("Profile completed 🎉");
    navigate("/dashboard");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* MAIN UI */}
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-10">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 sm:p-8"
        >

          {/* HEADER */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Complete Your Profile
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Step {step + 1} of 4
            </p>
          </div>

          {/* PROGRESS */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-8 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 transition-all duration-500"
              style={{ width: `${(step + 1) * 25}%` }}
            />
          </div>

          <div className="space-y-6">

            {/* STEP 1 */}
            {step === 0 && (
              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-600">Username</label>

                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="h-12 rounded-xl"
                />

                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600"
                  disabled={!username.trim()}
                  onClick={() => setStep(1)}
                >
                  Continue →
                </Button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <div className="space-y-4">
                <Input value={user.email} disabled className="h-12 rounded-xl bg-gray-100" />
                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600" onClick={() => setStep(2)}>
                  Continue →
                </Button>
              </div>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <div className="space-y-4">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="h-12 rounded-xl"
                />
                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600" onClick={() => setStep(3)}>
                  Continue →
                </Button>
              </div>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <div className="space-y-6">

                <div className="flex flex-col items-center gap-4">

                  <img
                    src={preview || "https://i.pravatar.cc/150"}
                    className="w-28 h-28 rounded-full object-cover border-4 border-gray-200 shadow-md"
                  />

                  <div
                    {...getRootProps()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition"
                  >
                    <input {...getInputProps()} />
                    <UploadCloud className="mx-auto mb-2 text-gray-500" />
                    <p className="text-sm font-medium text-gray-700">Click or Drag image</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, HEIC supported</p>
                  </div>

                  {uploadProgress > 0 && (
                    <div className="w-full">
                      <div className="text-xs text-gray-500 mb-1">
                        Uploading {uploadProgress}%
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                </div>

                <Button
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600"
                  onClick={finishSetup}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Complete Setup 🎉"}
                </Button>

              </div>
            )}

          </div>
        </motion.div>
      </div>

      {/* 🔥 CROPPER */}
      {cropImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
  <div className="bg-white p-4 rounded-xl w-[320px]">

    {/* 🔥 IMPORTANT FIX */}
    <div className="relative w-full h-[250px] bg-black rounded-lg overflow-hidden">
      <Cropper
        image={cropImage}
        crop={crop}
        zoom={zoom}
        aspect={1}
        onCropChange={setCrop}
        onZoomChange={setZoom}
        onCropComplete={(_, area) => setCroppedArea(area)}
      />
    </div>

    {/* BUTTONS */}
    <div className="flex gap-2 mt-4">
      <Button
        variant="outline"
        className="w-full"
        onClick={() => setCropImage(null)}
      >
        Cancel
      </Button>

      <Button
        className="w-full"
        onClick={async () => {
          const image = new Image();
          image.src = cropImage!;
          await new Promise((res) => (image.onload = res));

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = croppedArea.width;
          canvas.height = croppedArea.height;

          ctx?.drawImage(
            image,
            croppedArea.x,
            croppedArea.y,
            croppedArea.width,
            croppedArea.height,
            0,
            0,
            croppedArea.width,
            croppedArea.height
          );

          canvas.toBlob(async (blob: any) => {
            const file = new File([blob], "cropped.jpg", {
              type: "image/jpeg",
            });

            await uploadAvatar(file);
          });

          setCropImage(null);
        }}
      >
        Done
      </Button>
    </div>

  </div>
</div>
      )}
    </>
  );
}