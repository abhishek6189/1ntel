// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isAdminRole = (role: unknown) => String(role || "").trim().toLowerCase() === "admin";

const hasAdminAccess = async (adminClient: any, user: any) => {
  const metadataRoles = [
    user?.app_metadata?.role,
    user?.app_metadata?.user_role,
    user?.user_metadata?.role,
    user?.user_metadata?.user_role,
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];

  if (metadataRoles.some(isAdminRole)) return true;

  const email = String(user.email || "").trim();
  const profileChecks = [
    adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    adminClient.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
  ];

  if (email) {
    profileChecks.push(adminClient.from("profiles").select("role").ilike("email", email).maybeSingle());
  }

  const profileResults = await Promise.all(profileChecks);

  if (profileResults.some((result) => !result.error && isAdminRole(result.data?.role))) {
    return true;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleError && roleRows?.some((row: any) => isAdminRole(row.role))) {
    return true;
  }

  const { data: hasRole, error: rpcError } = await adminClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (!rpcError && hasRole === true) return true;

  const adminEmails = String(Deno.env.get("ADMIN_EMAILS") || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(email && adminEmails.includes(email.toLowerCase()));
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!serviceKey) {
      return json({ error: "Admin service is not configured." }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) {
      return json({ error: "Login required." }, 401);
    }

    if (!(await hasAdminAccess(adminClient, userData.user))) {
      return json({ error: "Admin access required." }, 403);
    }

    const { data: subscriptions, error: subscriptionError } = await adminClient
      .from("subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (subscriptionError) throw subscriptionError;

    const { data: listingCreditPayments, error: creditError } = await adminClient
      .from("listing_credit_payments")
      .select("*")
      .order("created_at", { ascending: false });

    return json({
      subscriptions: subscriptions || [],
      listingCreditPayments: creditError ? [] : listingCreditPayments || [],
    });
  } catch (error: any) {
    return json({ error: error?.message || "Could not load admin metrics." }, 500);
  }
});
