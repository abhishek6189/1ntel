import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";

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
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // 🔥 FORCE TYPE (IMPORTANT)
      const role = (data as any)?.role;

      if (role === "dealer") {
        setIsSeller(true);
      }

      setLoading(false);
    };

    check();

  }, []);

  if (loading) return <div>Checking...</div>;

  if (!isSeller) return <Navigate to="/" />;

  return children;
};

export default SellerRoute;