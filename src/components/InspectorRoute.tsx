import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";

const InspectorRoute = ({ children }: any) => {

  const [loading, setLoading] = useState(true);
  const [isInspector, setIsInspector] = useState(false);

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
        console.error("InspectorRoute error:", error);
        setLoading(false);
        return;
      }

      const role = (data as any)?.role;

      if (role === "inspector") {
        setIsInspector(true);
      }

      setLoading(false);
    };

    check();

  }, []);

  if (loading) return <div>Checking...</div>;

  if (!isInspector) return <Navigate to="/" />;

  return children;
};

export default InspectorRoute;