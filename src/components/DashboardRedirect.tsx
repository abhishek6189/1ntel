import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GlobalLoader from "@/components/GlobalLoader";

const DashboardRedirect = () => {

  const navigate = useNavigate();

  useEffect(() => {
    const redirectUser = async () => {

      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role;

      if (role === "dealer") {
        navigate("/dealer-dashboard");
      } else {
        navigate("/dashboard");
      }
    };

    redirectUser();
  }, []);

  return <GlobalLoader className="min-h-screen" />;
};

export default DashboardRedirect;
