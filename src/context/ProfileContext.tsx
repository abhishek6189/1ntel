import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ProfileContext = createContext<any>(null);

export const ProfileProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD PROFILE ================= */
  const loadProfile = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        console.error("Auth error:", error.message);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const currentUser = data.user;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError.message);
        setProfile(null);
      } else {
        setProfile(profileData);
      }

      setLoading(false);
    } catch (err) {
      console.error("Unexpected error:", err);
      setLoading(false);
    }
  };

  /* ================= INIT ================= */
  useEffect(() => {
    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /* ================= ONLINE STATUS (FIXED LOCATION) ================= */
  useEffect(() => {
    const updatePresence = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) return;

      await supabase
        .from("profiles")
        .update({ last_seen: new Date() })
        .eq("id", currentUser.id);
    };

    updatePresence();

    const interval = setInterval(updatePresence, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

/* ================= HOOK ================= */
export const useProfile = () => {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }

  return context;
};