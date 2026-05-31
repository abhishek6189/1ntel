import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GlobalLoader from "@/components/GlobalLoader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Car,
  Plus,
  DollarSign,
  Eye,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FALLBACK_AVATAR_URL, getImageUploadPath, prepareImageForUpload } from "@/utils/imageFiles";
import type { SubscriptionAccess } from "@/utils/subscriptionAccess";
import { getFunctionErrorMessage } from "@/utils/functionErrors";
import {
  getListingAllowance,
  startListingCreditCheckout,
  type ListingAllowance,
} from "@/utils/listingAccess";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [cars, setCars] = useState<any[]>([]);
  const [savedCars, setSavedCars] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profilePromptOpen, setProfilePromptOpen] = useState(false);
  const [subscriptionAccess, setSubscriptionAccess] = useState<SubscriptionAccess | null>(null);
  const [listingAllowance, setListingAllowance] = useState<ListingAllowance | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [creditCheckoutLoading, setCreditCheckoutLoading] = useState(false);
  const syncedSessionRef = useRef<string | null>(null);
  const [profileDraft, setProfileDraft] = useState({
    full_name: "",
    email: "",
    phone: "",
    avatar_url: "",
  });

  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("listings");

  useEffect(() => {
    loadData();

    if (params.get("tab") === "settings") {
      setActiveTab("settings");
    }
  }, []);

  const syncCheckoutReturn = async () => {
    const sessionId = params.get("session_id");
    if (!sessionId || syncedSessionRef.current === sessionId) return;

    syncedSessionRef.current = sessionId;

    try {
      const isListingCreditReturn = params.get("listing_credit") === "success";
      const { data, error } = await supabase.functions.invoke(
        isListingCreditReturn ? "sync-listing-credit-checkout" : "sync-subscription-checkout",
        { body: { session_id: sessionId } }
      );

      if (error) {
        throw new Error(await getFunctionErrorMessage(error, "Payment succeeded, but sync failed."));
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success(
        isListingCreditReturn
          ? "Payment confirmed. One listing credit was added."
          : "Payment confirmed. Your plan is active."
      );
      setParams({}, { replace: true });
    } catch (err: any) {
      syncedSessionRef.current = null;
      toast.error(err?.message || "Payment sync failed. Please refresh once.");
    }
  };

  const loadData = async () => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data.user;

    if (!currentUser) return;

    setUser(currentUser);
    await syncCheckoutReturn();

    // PROFILE
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    setProfile(profileData);
    const allowance = await getListingAllowance(currentUser.id);
    const access = allowance.access;
    setListingAllowance(allowance);
    setSubscriptionAccess(access);
    setProfileDraft({
      full_name: profileData?.full_name || "",
      email: profileData?.email?.includes("@phone.1ntel.local") ? "" : profileData?.email || "",
      phone: profileData?.phone || currentUser.user_metadata?.phone || "",
      avatar_url: profileData?.avatar_url || "",
    });

    const promptDismissed = localStorage.getItem(`profile_prompt_dismissed_${currentUser.id}`);
    if (!profileData?.profile_completed && !promptDismissed) {
      setProfilePromptOpen(true);
    }

    // 🔒 PROFILE SETUP PROTECTION
    // CARS
    const { data: carsData } = await supabase
      .from("cars")
      .select(`*, car_images (image_url)`)
      .eq("seller_id", currentUser.id)
      .order("created_at", { ascending: false });

    setCars(access.allowed ? carsData || [] : []);

    // ✅ SAVED CARS
    const { data: savedData } = await supabase
      .from("saved_cars")
      .select(`car_id, cars (*, car_images (image_url))`)
      .eq("user_id", currentUser.id);

    setSavedCars(savedData || []);

    setLoading(false);
  };

  /* DELETE */
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing?")) return;

    await supabase.from("cars").delete().eq("id", id);
    setCars(cars.filter((c) => c.id !== id));
    toast.success("Deleted");
  };

  /* PLAN */
  const plan = subscriptionAccess?.plan || profile?.plan || "free";
  const normalizedPlan = String(plan || "free").toLowerCase();
  const showRevenueStat = !["free", "garage"].includes(normalizedPlan);
  const LIMIT = listingAllowance?.displayLimit || subscriptionAccess?.limit || 2;
  const displayedListingUsage = listingAllowance?.displayUsed ?? cars.length;
  const isLimitReached = listingAllowance ? !listingAllowance.canCreate : cars.length >= LIMIT;
  const needsListingCredit = Boolean(listingAllowance?.needsCredit);
  const listingAccessAllowed = subscriptionAccess?.allowed !== false;

  /* STATS */
  const active = cars.filter((c) => c.status !== "sold").length;
  const sold = cars.filter((c) => c.status === "sold").length;

  const formatMoney = (value: any) => `$${Number(value || 0).toLocaleString()}`;

  const totalValue = cars
    .filter((c) => c.status === "sold" && c.sold_source === "platform")
    .reduce((a, c) => a + (c.price || 0), 0);

  const dismissProfilePrompt = () => {
    if (user?.id) {
      localStorage.setItem(`profile_prompt_dismissed_${user.id}`, "true");
    }
    setProfilePromptOpen(false);
  };

  const saveProfilePrompt = async () => {
    if (!user) return;

    if (!profileDraft.full_name.trim()) {
      return toast.error("Please enter your name");
    }

    if (!profileDraft.email.trim()) {
      return toast.error("Please enter your email");
    }

    setSavingProfile(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profileDraft.full_name.trim(),
        email: profileDraft.email.trim(),
        phone: profileDraft.phone.trim(),
        avatar_url: profileDraft.avatar_url,
        profile_completed: true,
      })
      .eq("id", user.id);

    setSavingProfile(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    localStorage.removeItem(`profile_prompt_dismissed_${user.id}`);
    toast.success("Profile saved");
    setProfilePromptOpen(false);
    loadData();
  };

  const uploadProfilePhoto = async (file?: File) => {
    if (!file || !user) return;

    setSavingProfile(true);

    try {
      const uploadFile = await prepareImageForUpload(file);
      const filePath = getImageUploadPath(user.id, uploadFile);
      const { error } = await supabase.storage
        .from("avtars")
        .upload(filePath, uploadFile, {
          contentType: uploadFile.type,
        });

      if (error) throw error;

      const { data } = supabase.storage.from("avtars").getPublicUrl(filePath);
      await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", user.id);

      setProfileDraft((prev) => ({ ...prev, avatar_url: data.publicUrl }));
      toast.success("Photo uploaded");
    } catch (err: any) {
      console.error("Profile photo upload error:", err);
      toast.error(err?.message || "Could not upload this photo");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <GlobalLoader className="min-h-screen" />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <Dialog open={profilePromptOpen} onOpenChange={(open) => {
        if (!open) dismissProfilePrompt();
      }}>
        <DialogContent className="max-w-[92vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Complete your profile
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add your basic details now, or close this and finish it later from Settings.
            </p>

            <div>
              <Label>Full name</Label>
              <Input
                value={profileDraft.full_name}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="Your name"
              />
            </div>

            <div>
              <Label>Email</Label>
              <Input
                value={profileDraft.email}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="you@example.com"
                inputMode="email"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                value={profileDraft.phone}
                onChange={(e) =>
                  setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1 555 123 4567"
                inputMode="tel"
              />
            </div>

            <div>
              <Label>Profile photo</Label>
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={profileDraft.avatar_url || FALLBACK_AVATAR_URL}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_AVATAR_URL;
                  }}
                  className="h-14 w-14 rounded-full object-cover"
                />
                <Input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={(e) => uploadProfilePhoto(e.target.files?.[0])}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={saveProfilePrompt} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Profile"}
              </Button>
              <Button variant="outline" onClick={dismissProfilePrompt}>
                Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-500 sm:text-base">
              Welcome back, {profile?.full_name || user?.email?.split("@")[0]}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Badge className="bg-blue-100 text-blue-700">
              {plan.toUpperCase()} — {displayedListingUsage}/{LIMIT}
              {listingAllowance?.paidListingCredits
                ? ` • ${listingAllowance.paidListingCredits} credit${listingAllowance.paidListingCredits === 1 ? "" : "s"}`
                : ""}
            </Badge>

            <Button
              className="w-full sm:w-auto"
              variant="outline"
              onClick={() => navigate(needsListingCredit ? "/pricing?plan=individual" : "/pricing")}
            >
              {!listingAccessAllowed
                ? "Renew plan"
                : needsListingCredit
                  ? "Buy Listing Credit"
                  : plan === "free" || plan === "individual"
                    ? "Upgrade"
                    : "Current plan"}
            </Button>
          </div>
        </div>

        {/* STATS */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${showRevenueStat ? "md:grid-cols-4" : "md:grid-cols-3"} gap-3 sm:gap-4 mb-6`}>
          <Stat icon={<Car />} label="Active" value={active} color="bg-blue-100 text-blue-600" />
          <Stat icon={<Eye />} label="Sold" value={sold} color="bg-purple-100 text-purple-600" />
          {showRevenueStat && (
            <Stat icon={<DollarSign />} label="Revenue" value={formatMoney(totalValue)} color="bg-yellow-100 text-yellow-600" />
          )}
        </div>

        {/* TABS */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
          <Button variant={activeTab === "listings" ? "secondary" : "ghost"} onClick={() => setActiveTab("listings")}>
            My Listings
          </Button>

          <Button variant={activeTab === "saved" ? "secondary" : "ghost"} onClick={() => setActiveTab("saved")}>
            Saved Cars
          </Button>

          <Button variant={activeTab === "settings" ? "secondary" : "ghost"} onClick={() => setActiveTab("settings")}>
            Settings
          </Button>
        </div>

        {/* ================= LISTINGS ================= */}
        {activeTab === "listings" && (
          <>
            {!listingAccessAllowed && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <p className="font-semibold">Listing access is temporarily blocked.</p>
                <p className="mt-1">
                  {subscriptionAccess?.reason || "Please renew your subscription to restore your listings."}
                </p>
                <Button className="mt-3" onClick={() => navigate("/pricing")}>
                  Renew Plan
                </Button>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:justify-between gap-4 mb-4">
              <h3 className="font-semibold">Your Listings</h3>

              {!listingAccessAllowed ? (
                <Button className="w-full bg-red-500 md:w-auto" onClick={() => navigate("/pricing")}>
                  Renew your plan
                </Button>
              ) : isLimitReached ? (
                <Button
                  className="w-full bg-red-500 md:w-auto"
                  disabled={creditCheckoutLoading}
                  onClick={async () => {
                    if (!needsListingCredit) {
                      navigate("/pricing");
                      return;
                    }

                    try {
                      setCreditCheckoutLoading(true);
                      await startListingCreditCheckout();
                    } catch (err: any) {
                      toast.error(err?.message || "Could not start checkout.");
                      setCreditCheckoutLoading(false);
                    }
                  }}
                >
                  {creditCheckoutLoading ? "Opening checkout..." : needsListingCredit ? "Buy $29 listing credit" : "Upgrade your plan"}
                </Button>
              ) : (
                <Button className="w-full md:w-auto" onClick={() => navigate("/dashboard/create-listing")}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Car
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {cars.map((car) => (
                <div key={car.id} className="bg-white border rounded-xl p-4 flex flex-col md:flex-row gap-4">

                  <img
                    src={car.car_images?.[0]?.image_url || "https://via.placeholder.com/150"}
                    className="w-full md:w-32 h-32 object-cover rounded-lg"
                  />

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{car.title}</h4>
                    <p className="text-sm text-gray-500">{car.location} • {car.year}</p>
                    <p className="font-bold">{formatMoney(car.price)}</p>
                  </div>

                  <div className="flex flex-row items-center gap-2 md:flex-col md:items-stretch">
                    <Badge>{car.status || "active"}</Badge>

                    {car.status !== "sold" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const source = prompt("platform or external?");
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

                  <div className="flex gap-2 md:self-start">
                    <Button size="icon" variant="ghost" onClick={() => navigate(`/car/${car.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => navigate(`/dashboard/create-listing?edit=${car.id}`)}>
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="ghost" onClick={() => handleDelete(car.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ================= SAVED ================= */}
        {activeTab === "saved" && (
          <div className="space-y-4">
            <h3 className="font-semibold">Saved Cars</h3>

            {savedCars.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border">
                No saved cars
              </div>
            ) : (
              savedCars.map((item: any) => {
                const car = item.cars;

                return (
                  <div key={car.id} className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">

                    <img
                      src={car.car_images?.[0]?.image_url || "https://via.placeholder.com/150"}
                      className="w-full md:w-32 h-32 object-cover rounded-lg"
                    />

                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold">{car.title}</h4>
                      <p className="text-sm text-gray-500">{car.location} • {car.year}</p>
                      <p className="font-bold">{formatMoney(car.price)}</p>
                    </div>

                    <Button className="w-full md:w-auto" onClick={() => navigate(`/car/${car.id}`)}>
                      View
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ================= SETTINGS ================= */}
        {activeTab === "settings" && (
          <div className="bg-white border rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>Name</div>
              <div>{profile?.full_name}</div>

              <div>Email</div>
              <div>{profile?.email || user?.email}</div>

              <div>Plan</div>
              <div>{plan}</div>

              <div>Listings</div>
              <div>{displayedListingUsage}/{LIMIT}</div>
            </div>

            <Button className="mt-6 w-full sm:w-auto" variant="outline" onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth?mode=login");
            }}>
              Log Out
            </Button>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

/* STAT */
const Stat = ({ icon, label, value, color }: any) => (
  <div className="bg-white border rounded-xl p-4 flex items-center gap-3 min-w-0">
    <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="break-words text-lg font-bold sm:text-xl">{value}</p>
    </div>
  </div>
);
