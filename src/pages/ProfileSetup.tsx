import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ProfileSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectAway = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!user) {
        navigate("/auth", { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, dealer_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "dealer" || profile?.dealer_status === "pending") {
        navigate("/dealer-pending", { replace: true });
        return;
      }

      if (profile?.role === "admin") {
        navigate("/admin", { replace: true });
        return;
      }

      navigate("/dashboard", { replace: true });
    };

    redirectAway();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  );
}
