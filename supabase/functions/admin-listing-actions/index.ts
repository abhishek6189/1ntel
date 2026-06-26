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

const getMissingSchemaColumn = (error: any) => {
  const message = String(error?.message || error?.details || "");
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column [^.]+\."?([^"\s]+)"? does not exist/i);

  return match?.[1] || null;
};

const updateCarWithFallback = async (
  adminClient: any,
  carId: string,
  payload: Record<string, unknown>
) => {
  const currentPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await adminClient.from("cars").update(currentPayload).eq("id", carId);
    if (!error) return;

    const missingColumn = getMissingSchemaColumn(error);
    if (missingColumn && missingColumn in currentPayload) {
      delete currentPayload[missingColumn];
      continue;
    }

    throw error;
  }
};

const ignoreMissingColumnDelete = async (query: PromiseLike<any>) => {
  const { error } = await query;
  if (error && !getMissingSchemaColumn(error)) throw error;
};

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

  for (const check of profileChecks) {
    const { data, error } = await check;
    if (!error && isAdminRole(data?.role)) return true;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleError && roleRows?.some((row: any) => isAdminRole(row.role))) return true;

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

    if (!serviceKey) return json({ error: "Admin service is not configured." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey);
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Login required." }, 401);

    const isAdmin = await hasAdminAccess(adminClient, userData.user);
    if (!isAdmin) {
      return json({ error: "Admin access required." }, 403);
    }

    const { action, carId, value } = await req.json();
    if (!carId || typeof carId !== "string") {
      return json({ error: "Listing id is required." }, 400);
    }

    if (action === "delete_listing") {
      await updateCarWithFallback(adminClient, carId, {
        status: "removed",
        is_featured: false,
        feature_request_status: "none",
      });

      await ignoreMissingColumnDelete(adminClient.from("car_images").delete().eq("car_id", carId));
      await ignoreMissingColumnDelete(adminClient.from("saved_cars").delete().eq("car_id", carId));
      await ignoreMissingColumnDelete(adminClient.from("saved_cars").delete().eq("listing_id", carId));

      const { error: deleteError } = await adminClient.from("cars").delete().eq("id", carId);
      if (!deleteError) return json({ ok: true, deleted: true });

      return json({ ok: true, deleted: false, status: "removed" });
    }

    if (action === "update_inspection") {
      await updateCarWithFallback(adminClient, carId, { inspection_status: value });
      return json({ ok: true });
    }

    if (action === "update_feature") {
      const payload =
        value === "approved"
          ? { is_featured: true, feature_request_status: "approved" }
          : value === "rejected"
            ? { feature_request_status: "rejected" }
            : { is_featured: false, feature_request_status: "none" };

      await updateCarWithFallback(adminClient, carId, payload);
      return json({ ok: true });
    }

    return json({ error: "Invalid admin listing action." }, 400);
  } catch (error: any) {
    return json({ error: error?.message || "Admin listing action failed." }, 500);
  }
});
