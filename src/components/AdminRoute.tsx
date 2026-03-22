import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }: any) => {

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

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
        console.error("AdminRoute error:", error);
        setLoading(false);
        return;
      }

      const role = (data as any)?.role;

      if (role === "admin") {
        setIsAdmin(true);
      }

      setLoading(false);
    };

    check();

  }, []);

  if (loading) return <div>Checking access...</div>;

  if (!isAdmin) return <Navigate to="/" />;

  return children;
};

export default AdminRoute;