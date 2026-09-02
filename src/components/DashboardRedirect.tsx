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

      const getProfile = async (column: "id" | "user_id") => {
        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("role")
          .eq(column, data.user.id)
          .maybeSingle();
        return profile;
      };

      const profile =
        (await getProfile("id")) ||
        (await getProfile("user_id"));

      const role = profile?.role;

      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "dealer") {
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
