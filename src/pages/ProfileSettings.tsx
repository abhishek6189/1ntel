// 🔥 FULLY FIXED PROFILE SETTINGS (NO BUG VERSION)

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalLoader from "@/components/GlobalLoader";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Mail, Phone, Camera } from "lucide-react";
import { FALLBACK_AVATAR_URL, getImageUploadPath, prepareImageForUpload } from "@/utils/imageFiles";

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("username");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  /* ================= LOAD ================= */
  const loadUser = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);

    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return;
    }

    /* ✅ GOOGLE USER FIX */
    if (!profileData) {
      const avatarFromGoogle =
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        "";

      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          id: currentUser.id,
          email: currentUser.email?.includes("@phone.1ntel.local") ? "" : currentUser.email,
          full_name:
            currentUser.user_metadata?.full_name ||
            currentUser.user_metadata?.name ||
            "",
          avatar_url: avatarFromGoogle,
        })
        .select()
        .single();

      setProfile(newProfile);
      setUsername(newProfile.full_name || "");
      setEmail(newProfile.email || "");
      setAvatar(newProfile.avatar_url || "");
      return;
    }

    setProfile(profileData);

    /* ✅ IMPORTANT FIX (fallbacks) */
    setUsername(
      profileData.full_name ||
        currentUser.user_metadata?.full_name ||
        ""
    );

    setPhone(profileData.phone || "");
    setEmail(profileData.email?.includes("@phone.1ntel.local") ? "" : profileData.email || "");

    setAvatar(
      profileData.avatar_url ||
        currentUser.user_metadata?.avatar_url ||
        currentUser.user_metadata?.picture ||
        ""
    );
  };

  /* ================= UPDATE ================= */
  const updateProfile = async () => {
    if (!username.trim()) {
      return toast.error("Username required");
    }

    setLoading(true);

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("full_name", username)
      .neq("id", user.id)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      return toast.error("Username already taken ❌");
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: username,
        email: email.trim(),
        phone: phone,
        avatar_url: avatar,
        profile_completed: Boolean(username.trim() && email.trim()),
      })
      .eq("id", user.id);

    if (error) {
      setLoading(false);
      console.error(error);
      return toast.error(error.message);
    }

    toast.success("Profile updated 🚀");

    await loadUser(); // 🔥 refresh state
    setLoading(false);
  };

  /* ================= UPLOAD ================= */
  const uploadAvatar = async (file: File) => {
    if (!file) return;

    setLoading(true);

    try {
      const uploadFile = await prepareImageForUpload(file);
      const filePath = getImageUploadPath(user.id, uploadFile);

      const { error } = await supabase.storage
        .from("avtars")
        .upload(filePath, uploadFile, {
          contentType: uploadFile.type,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("avtars")
        .getPublicUrl(filePath);

      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      setAvatar(data.publicUrl);
      toast.success("Photo uploaded");
    } catch (err: any) {
      console.error("Photo upload error:", err);
      toast.error(err?.message || "Could not upload this photo");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <GlobalLoader className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">

        {/* HEADER */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-500 mb-6">
          Manage your identity
        </p>

        {/* PROFILE CARD */}
        <div className="bg-white border rounded-xl p-4 sm:p-6 flex flex-col gap-4 mb-6 sm:flex-row sm:items-center">
          <img
            src={
              avatar ||
              user?.user_metadata?.avatar_url ||
              user?.user_metadata?.picture ||
              FALLBACK_AVATAR_URL
            }
            onError={(e) => {
              e.currentTarget.src = FALLBACK_AVATAR_URL;
            }}
            className="w-16 h-16 rounded-full object-cover"
          />

          <div className="min-w-0 text-center sm:text-left">
            <h3 className="font-semibold text-lg">
              {username || "User"}
            </h3>

            <p className="break-words text-gray-500 text-sm">
              {email || "Email not added"}
            </p>

            <p className="text-green-600 text-xs mt-1">
              ✓ Profile Active
            </p>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Tab icon={<User size={16} />} label="Username" active={activeTab === "username"} onClick={() => setActiveTab("username")} />
          <Tab icon={<Mail size={16} />} label="Email" active={activeTab === "email"} onClick={() => setActiveTab("email")} />
          <Tab icon={<Phone size={16} />} label="Phone" active={activeTab === "phone"} onClick={() => setActiveTab("phone")} />
          <Tab icon={<Camera size={16} />} label="Photo" active={activeTab === "photo"} onClick={() => setActiveTab("photo")} />
        </div>

        {activeTab === "username" && (
          <Card>
            <h3 className="font-semibold mb-2">Username</h3>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            <Button className="mt-4 w-full sm:w-auto" onClick={updateProfile} disabled={loading}>
              Save Changes
            </Button>
          </Card>
        )}

        {activeTab === "phone" && (
          <Card>
            <h3 className="font-semibold mb-2">Phone</h3>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button className="mt-4 w-full sm:w-auto" onClick={updateProfile} disabled={loading}>
              Save Phone
            </Button>
          </Card>
        )}

        {activeTab === "email" && (
          <Card>
            <h3 className="font-semibold mb-2">Email</h3>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              inputMode="email"
            />
            <p className="mt-2 text-xs text-gray-500">
              This is your contact email on 1ntel. Your login still uses your phone number.
            </p>
            <Button className="mt-4 w-full sm:w-auto" onClick={updateProfile} disabled={loading}>
              Save Email
            </Button>
          </Card>
        )}

        {activeTab === "photo" && (
          <Card>
            <h3 className="font-semibold mb-4">Profile Photo</h3>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <img
                src={
                  avatar ||
                  user?.user_metadata?.avatar_url ||
                  user?.user_metadata?.picture ||
                  FALLBACK_AVATAR_URL
                }
                onError={(e) => {
                  e.currentTarget.src = FALLBACK_AVATAR_URL;
                }}
                className="w-20 h-20 rounded-full"
              />

              <input
                type="file"
                accept="image/*,.heic,.heif"
                className="w-full text-sm"
                onChange={(e: any) => uploadAvatar(e.target.files[0])}
              />
            </div>

            <Button className="mt-4 w-full sm:w-auto" onClick={updateProfile} disabled={loading}>
              Save Photo
            </Button>
          </Card>
        )}

      </div>

      <Footer />
    </div>
  );
}

const Card = ({ children }: any) => (
  <div className="bg-white border rounded-xl p-4 sm:p-6">{children}</div>
);

const Tab = ({ icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm
      ${active ? "bg-gray-100 font-medium" : "hover:bg-gray-50"}`}
  >
    {icon}
    {label}
  </button>
);
