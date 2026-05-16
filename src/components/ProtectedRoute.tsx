import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";

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
          .select("is_banned, account_status")
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
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  // ❌ NOT LOGGED IN → REDIRECT
  if (!user) {
    return <Navigate to="/auth?mode=login" replace />;
  }

  // ✅ LOGGED IN → SHOW PAGE
  return children;
};

export default ProtectedRoute;
