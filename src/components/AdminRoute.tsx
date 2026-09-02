import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import GlobalLoader from "@/components/GlobalLoader";

const normalizeRole = (role: unknown) =>
  String(role || "").trim().toLowerCase();

const isAdminRole = (role: unknown) => normalizeRole(role) === "admin";

const getProfileByColumn = async (column: string, value?: string | null) => {
  if (!value) return null;

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("role")
    .eq(column, value)
    .maybeSingle();

  if (error) {
    console.warn(`Admin profile check failed for ${column}:`, error.message);
    return null;
  }

  return data;
};

const checkAdminAccess = async (user: any) => {
  // app_metadata can only be assigned by the server and is safe for access
  // checks. Do not trust user_metadata here because users can edit it.
  const appMetadataRoles = [
    user?.app_metadata?.role,
    user?.app_metadata?.user_role,
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];

  if (appMetadataRoles.some(isAdminRole)) return true;

  const profile =
    (await getProfileByColumn("id", user.id)) ||
    (await getProfileByColumn("user_id", user.id)) ||
    (await getProfileByColumn("email", user.email));

  if (isAdminRole(profile?.role)) return true;

  const { data: roleRows, error: roleError } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleError && roleRows?.some((row: any) => isAdminRole(row.role))) {
    return true;
  }

  const { data: hasRole, error: rpcError } = await (supabase as any).rpc(
    "has_role",
    {
      _user_id: user.id,
      _role: "admin",
    }
  );

  if (!rpcError && hasRole === true) return true;

  return false;
};

const AdminRoute = ({ children }: any) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setHasUser(false);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setHasUser(true);
      setIsAdmin(await checkAdminAccess(user));
      setLoading(false);
    };

    check();
  }, []);

  if (loading) return <GlobalLoader className="min-h-screen" />;

  if (!hasUser) return <Navigate to="/auth?mode=login" replace />;

  if (!isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
