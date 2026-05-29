import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import { isAccountBanned, showBannedAccountMessage } from "@/utils/accountBan";
import GlobalLoader from "@/components/GlobalLoader";

const SellerRoute = ({ children }: any) => {

  const [loading, setLoading] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {

    const check = async () => {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, dealer_status, is_banned")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // 🔥 FORCE TYPE (IMPORTANT)
      if (isAccountBanned(data)) {
        await supabase.auth.signOut();
        showBannedAccountMessage();
        setLoading(false);
        return;
      }

      const role = (data as any)?.role;
      const dealerStatus = (data as any)?.dealer_status;

      if (role === "dealer" && dealerStatus === "approved") {
        setIsSeller(true);
      }

      setLoading(false);
    };

    check();

  }, []);

  if (loading) return <GlobalLoader className="min-h-screen" />;

  if (!isSeller) return <Navigate to="/" />;

  return children;
};

export default SellerRoute;
