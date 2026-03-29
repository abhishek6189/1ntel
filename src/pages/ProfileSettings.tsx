import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { User, Mail, Phone, Camera } from "lucide-react";

export default function ProfileSettings() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [activeTab, setActiveTab] = useState("username");

  const [username, setUsername] = useState("");
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

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (!profileData) return;

    setProfile(profileData);
    setUsername(profileData.full_name || "");
    setPhone(profileData.phone || "");
    setAvatar(profileData.avatar_url || "");
  };

  /* ================= UPDATE ================= */
  const updateProfile = async () => {
    if (!username.trim()) {
      return toast.error("Username required");
    }

    setLoading(true);

    // 🔥 CHECK UNIQUE USERNAME
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
        phone: phone,
        avatar_url: avatar,
      })
      .eq("id", user.id);

    setLoading(false);

    if (error) return toast.error(error.message);

    toast.success("Profile updated 🚀");

    loadUser(); // refresh
  };

  /* ================= UPLOAD ================= */
  const uploadAvatar = async (file: File) => {
    if (!file) return;

    setLoading(true);

    const filePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
      .from("avtars") // ✅ your bucket
      .upload(filePath, file);

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    const { data } = supabase.storage
      .from("avtars")
      .getPublicUrl(filePath);

    setAvatar(data.publicUrl);

    setLoading(false);
    toast.success("Photo uploaded ✅");
  };

  if (!user) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-2">Profile Settings</h1>
        <p className="text-gray-500 mb-6">
          Manage your identity on VerifyCar
        </p>

        {/* PROFILE CARD */}
        <div className="bg-white border rounded-xl p-6 flex items-center gap-4 mb-6">
          <img
            src={avatar || "https://i.pravatar.cc/100"}
            className="w-16 h-16 rounded-full object-cover"
          />

          <div>
            <h3 className="font-semibold text-lg">
              {username || "user"}
            </h3>

            <p className="text-gray-500 text-sm">{user?.email}</p>

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

        {/* USERNAME */}
        {activeTab === "username" && (
          <Card>
            <h3 className="font-semibold mb-2">Username</h3>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter unique username"
            />
            <Button className="mt-4" onClick={updateProfile} disabled={loading}>
              Save Changes
            </Button>
          </Card>
        )}

        {/* EMAIL */}
        {activeTab === "email" && (
          <Card>
            <h3 className="font-semibold mb-2">Email</h3>
            <p className="text-gray-500">{user.email}</p>
            <p className="text-sm text-green-600 mt-2">✓ Verified</p>
          </Card>
        )}

        {/* PHONE */}
        {activeTab === "phone" && (
          <Card>
            <h3 className="font-semibold mb-2">Phone</h3>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button className="mt-4" onClick={updateProfile} disabled={loading}>
              Save Phone
            </Button>
          </Card>
        )}

        {/* PHOTO */}
        {activeTab === "photo" && (
          <Card>
            <h3 className="font-semibold mb-4">Profile Photo</h3>

            <div className="flex items-center gap-4">
              <img
                src={avatar || "https://i.pravatar.cc/100"}
                className="w-20 h-20 rounded-full"
              />

              <input
                type="file"
                accept="image/*"
                onChange={(e: any) => uploadAvatar(e.target.files[0])}
              />
            </div>

            <Button className="mt-4" onClick={updateProfile} disabled={loading}>
              Save Photo
            </Button>
          </Card>
        )}

      </div>

      <Footer />
    </div>
  );
}

/* CARD */
const Card = ({ children }: any) => (
  <div className="bg-white border rounded-xl p-6">{children}</div>
);

/* TAB */
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