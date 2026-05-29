import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GlobalLoader from "@/components/GlobalLoader";

const RoleProtectedRoute = ({
  children,
  allowedRoles,
}: {
  children: JSX.Element;
  allowedRoles: string[];
}) => {

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    checkRole();
  }, []);

  const checkRole = async () => {

    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;

    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ FIX: add "as any"
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    setRole(profile?.role || "buyer");
    setLoading(false);
  };

  if (loading) return <GlobalLoader className="min-h-screen" />;

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleProtectedRoute;
