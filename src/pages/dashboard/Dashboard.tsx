import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  Plus,
  DollarSign,
  Eye,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    loadData();

    if (params.get("tab") === "settings") {
      setActiveTab("settings");
    }
  }, []);

  const loadData = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);

    // PROFILE
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    setProfile(profileData);

    // CARS
    const { data: carsData } = await supabase
      .from("cars")
      .select(`*, car_images (image_url)`)
      .eq("seller_id", currentUser.id)
      .order("created_at", { ascending: false });

    setCars(carsData || []);
    setLoading(false);
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    await supabase.from("cars").delete().eq("id", id);
    setCars(cars.filter((c) => c.id !== id));
    toast.success("Deleted");
  };

  /* ================= PLAN LOGIC ================= */
  const PLAN_LIMITS: any = {
    free: 2,
    garage: 10,
    dealer: 35,
  };

  const plan = profile?.plan || "free";
  const LIMIT = PLAN_LIMITS[plan];

  const isLimitReached = cars.length >= LIMIT;

  /* ================= STATS ================= */
  const active = cars.filter((c) => c.status !== "sold").length;
  const verified = cars.filter((c) => c.is_verified).length;
  const sold = cars.filter((c) => c.status === "sold").length;

  // 💰 ONLY PLATFORM SALES
  const totalValue = cars
    .filter((c) => c.status === "sold" && c.sold_source === "platform")
    .reduce((a, c) => a + (c.price || 0), 0);

  if (loading) return <div className="text-center py-20">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-500">
              Welcome back, {user?.email?.split("@")[0]}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <Badge className="bg-blue-100 text-blue-700">
              {plan.toUpperCase()} — {cars.length}/{LIMIT}
            </Badge>

            <Button variant="outline" onClick={() => navigate("/pricing")}>
              Upgrade
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Stat icon={<Car />} label="Active" value={active} color="bg-blue-100 text-blue-600" />
          <Stat icon={<CheckCircle />} label="Verified" value={verified} color="bg-green-100 text-green-600" />
          <Stat icon={<Eye />} label="Sold" value={sold} color="bg-purple-100 text-purple-600" />
          <Stat icon={<DollarSign />} label="Revenue" value={`$${totalValue}`} color="bg-yellow-100 text-yellow-600" />
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-4">
          <Button
            variant={activeTab === "listings" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("listings")}
          >
            My Listings
          </Button>

          <Button
            variant={activeTab === "settings" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </Button>
        </div>

        {/* ================= LISTINGS ================= */}
        {activeTab === "listings" && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Your Listings</h3>

              {/* 🔥 MAIN FIX HERE */}
              {isLimitReached ? (
                <Button
                  className="bg-red-500 hover:bg-red-600"
                  onClick={() => navigate("/pricing")}
                >
                  Upgrade your plan to list more cars 🚀
                </Button>
              ) : (
                <Button onClick={() => navigate("/dashboard/create-listing")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Car
                </Button>
              )}
            </div>

            {cars.length === 0 ? (
              <div className="border rounded-xl py-16 text-center bg-white">
                <Car className="mx-auto text-gray-400 mb-4" />
                <p className="font-semibold text-lg">No listings yet</p>

                {isLimitReached ? (
                  <Button onClick={() => navigate("/pricing")}>
                    Upgrade your plan 🚀
                  </Button>
                ) : (
                  <Button
                    className="mt-4"
                    onClick={() => navigate("/dashboard/create-listing")}
                  >
                    + List a Car
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {cars.map((car) => (
                  <div
                    key={car.id}
                    className="bg-white border rounded-xl p-4 flex gap-4 items-center"
                  >
                    {/* IMAGE */}
                    <img
                      src={
                        car.car_images?.[0]?.image_url ||
                        "https://via.placeholder.com/150"
                      }
                      className="w-32 h-24 object-cover rounded-lg"
                    />

                    {/* INFO */}
                    <div className="flex-1">
                      <h4 className="font-semibold">{car.title}</h4>
                      <p className="text-sm text-gray-500">
                        {car.location} • {car.year}
                      </p>
                      <p className="font-bold">${car.price}</p>
                    </div>

                    {/* STATUS */}
                    <div className="flex flex-col items-center gap-2">
                      <Badge className="capitalize">
                        {car.status || "active"}
                      </Badge>

                      {/* 🔥 SOLD BUTTON */}
                      {car.status !== "sold" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const source = prompt(
                              "Sold via platform or external?"
                            );

                            if (!source) return;

                            await supabase
                              .from("cars")
                              .update({
                                status: "sold",
                                sold_source: source.toLowerCase(),
                              })
                              .eq("id", car.id);

                            loadData();
                          }}
                        >
                          Mark Sold
                        </Button>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/car/${car.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate(`/dashboard/create-listing?edit=${car.id}`)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(car.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="bg-white border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>Name</div>
              <div>{user?.email?.split("@")[0]}</div>

              <div>Email</div>
              <div>{user?.email}</div>

              <div>Plan</div>
              <div>{plan}</div>

              <div>Listings</div>
              <div>
                {cars.length}/{LIMIT}
              </div>
            </div>

            <Button
              className="mt-6"
              variant="outline"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth?mode=login");
              }}
            >
              Log Out
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

/* ================= STAT ================= */
const Stat = ({ icon, label, value, color }: any) => (
  <div className="bg-white border rounded-xl p-4 flex items-center gap-3">
    <div className={`p-2 rounded-lg ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  </div>
);