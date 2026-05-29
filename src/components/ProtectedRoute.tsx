import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";
import GlobalLoader from "@/components/GlobalLoader";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 🔥 INITIAL CHECK
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user ?? null;

      if (sessionUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_banned")
          .eq("id", sessionUser.id)
          .maybeSingle();

        if (isAccountBanned(profile)) {
          await supabase.auth.signOut();
          showBannedAccountMessage();
          setUser(null);
          setLoading(false);
          return;
        }
      }

      setUser(sessionUser);
      setLoading(false);
    };

    getSession();

    // 🔥 REAL-TIME AUTH LISTENER (VERY IMPORTANT)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ⏳ LOADING STATE
  if (loading) return <GlobalLoader className="min-h-screen" />;

  // ❌ NOT LOGGED IN → REDIRECT
  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  // ✅ LOGGED IN → SHOW PAGE
  return children;
};

export default ProtectedRoute;
