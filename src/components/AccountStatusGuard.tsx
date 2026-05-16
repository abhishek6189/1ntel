import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";

const AccountStatusGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    const checkAccount = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user || !active) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_banned, account_status")
        .eq("id", user.id)
        .maybeSingle();

      if (!active || !isAccountBanned(profile)) return;

      await supabase.auth.signOut();
      showBannedAccountMessage();
      navigate("/auth?mode=login", { replace: true });
    };

    checkAccount();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      checkAccount();
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [location.pathname, navigate]);

  return null;
};

export default AccountStatusGuard;
