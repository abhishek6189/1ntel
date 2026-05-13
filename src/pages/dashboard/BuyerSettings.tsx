import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getImageUploadPath, prepareImageForUpload } from "@/utils/imageFiles";

const BuyerSettings = () => {

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({
    username: "",
    phone: "",
    avatar_url: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  /* ================= LOAD ================= */
  useEffect(() => {
    const loadProfile = async () => {

      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) return;

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  /* ================= UPLOAD AVATAR ================= */
  const uploadAvatar = async (e: any) => {

    if (!user) return;

    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const uploadFile = await prepareImageForUpload(file);
      const filePath = getImageUploadPath(user.id, uploadFile);

      const { error: uploadError } = await supabase.storage
        .from("avtars") // ✅ your bucket
        .upload(filePath, uploadFile, {
          contentType: uploadFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avtars")
        .getPublicUrl(filePath);

      setProfile((prev: any) => ({
        ...prev,
        avatar_url: data.publicUrl
      }));

    } catch (err) {
      console.error(err);
      alert("❌ Upload failed");
    }

    setUploading(false);
  };

  /* ================= UPDATE PROFILE ================= */
  const updateProfile = async () => {

    if (!user) return;

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username: profile.username || "", // ✅ FIXED
          phone: profile.phone || "",
          avatar_url: profile.avatar_url || "",
          email: user.email
        });

      if (error) {
        console.error("UPDATE ERROR:", error);
        alert(error.message);
        return;
      }

      alert("✅ Profile updated");

    } catch (err) {
      console.error(err);
      alert("❌ Failed to update profile");
    }

    setSaving(false);
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar />

      <div className="max-w-7xl mx-auto py-6 px-4 flex flex-col lg:flex-row gap-6">

        <DashboardSidebar />

        <div className="flex-1 min-w-0">

          <h1 className="text-2xl md:text-3xl font-bold mb-6">
            Account Settings
          </h1>

          <div className="bg-white border rounded-xl p-4 sm:p-6 max-w-lg space-y-5 shadow-sm">

            {/* AVATAR */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">

              <img
                src={
                  profile.avatar_url ||
                  `https://ui-avatars.com/api/?name=${profile.username || user?.email}`
                }
                className="w-16 h-16 rounded-full object-cover"
              />

              <div className="min-w-0">
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={uploadAvatar}
                  className="w-full text-sm"
                />
                {uploading && <p className="text-xs">Uploading...</p>}
              </div>

            </div>

            {/* USERNAME */}
            <div>
              <label className="text-sm text-gray-600">
                Username
              </label>
              <input
                className="w-full border rounded-lg p-2 mt-1"
                value={profile.username || ""}
                onChange={(e) =>
                  setProfile({ ...profile, username: e.target.value })
                }
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-sm text-gray-600">
                Email
              </label>
              <input
                className="w-full border rounded-lg p-2 mt-1 bg-gray-100"
                value={user?.email || ""}
                disabled
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="text-sm text-gray-600">
                Phone
              </label>
              <input
                className="w-full border rounded-lg p-2 mt-1"
                value={profile.phone || ""}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </div>

            {/* SAVE BUTTON */}
            <Button
              onClick={updateProfile}
              disabled={saving}
              className="w-full"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default BuyerSettings;
