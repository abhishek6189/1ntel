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

const getMissingSchemaColumn = (error: any) => {
  const message = String(error?.message || error?.details || "");
  const match = message.match(/Could not find the '([^']+)' column/i);
  return match?.[1] || null;
};

const updateProfileWithFallback = async (
  supabase: any,
  userId: string,
  payload: Record<string, unknown>
) => {
  const currentPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from("profiles").update(currentPayload).eq("id", userId);
    if (!error) return;

    const missingColumn = getMissingSchemaColumn(error);
    if (missingColumn && missingColumn in currentPayload) {
      delete currentPayload[missingColumn];
      continue;
    }

    throw error;
  }
};

const updateByIdWithFallback = async (
  supabase: any,
  table: string,
  id: string,
  payload: Record<string, unknown>
) => {
  const currentPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from(table).update(currentPayload).eq("id", id);
    if (!error) return;

    const missingColumn = getMissingSchemaColumn(error);
    if (missingColumn && missingColumn in currentPayload) {
      delete currentPayload[missingColumn];
      continue;
    }

    throw error;
  }
};

const hasAdminAccess = async (adminClient: any, user: any) => {
  const profileChecks = await Promise.all([
    adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    adminClient.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
    adminClient.from("profiles").select("role").eq("email", user.email).maybeSingle(),
  ]);

  if (profileChecks.some((result) => !result.error && String(result.data?.role || "").toLowerCase() === "admin")) {
    return true;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleError && roleRows?.some((row: any) => String(row.role || "").toLowerCase() === "admin")) {
    return true;
  }

  const { data: hasRole, error: rpcError } = await adminClient.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  return !rpcError && hasRole === true;
};

const syncUserRole = async (adminClient: any, userId: string, role: string) => {
  const roleForEnum = role === "dealer" ? "seller" : role === "user" ? "buyer" : role;
  const allowedRoles = new Set(["buyer", "seller", "inspector", "admin"]);

  if (!allowedRoles.has(roleForEnum)) return;

  await adminClient.from("user_roles").delete().eq("user_id", userId);
  const { error } = await adminClient.from("user_roles").insert({
    user_id: userId,
    role: roleForEnum,
  });

  if (error) throw error;
};

const maxListingsForPlan = (plan: string) => {
  if (plan === "dealer") return 35;
  if (plan === "garage") return 10;
  return 2;
};

const syncPlanAccess = async (adminClient: any, userId: string, plan: string) => {
  const normalizedPlan = String(plan || "").toLowerCase();
  const allowedPlans = new Set(["free", "individual", "garage", "dealer"]);
  if (!allowedPlans.has(normalizedPlan)) throw new Error("Invalid plan.");

  await updateProfileWithFallback(adminClient, userId, { plan: normalizedPlan });

  if (normalizedPlan === "free" || normalizedPlan === "individual") {
    const { error } = await adminClient
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", userId)
      .in("status", ["active", "trialing", "past_due"]);

    if (error) throw error;
    return;
  }

  const payload = {
    user_id: userId,
    plan: normalizedPlan,
    status: "active",
    max_listings: maxListingsForPlan(normalizedPlan),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { data: existingSubscription, error: findError } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;

  const { error } = existingSubscription?.id
    ? await adminClient.from("subscriptions").update(payload).eq("id", existingSubscription.id)
    : await adminClient.from("subscriptions").insert(payload);

  if (error) throw error;
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

    const { action, userId, value, requestId, rejectionReason } = await req.json();
    if (!userId || typeof userId !== "string") {
      return json({ error: "User id is required." }, 400);
    }

    if (userId === userData.user.id) {
      return json({ error: "You cannot change your own admin account here." }, 400);
    }

    if (action === "update_role") {
      const normalizedRole = String(value || "").toLowerCase();
      const allowedRoles = new Set(["buyer", "seller", "dealer", "inspector", "admin"]);
      if (!allowedRoles.has(normalizedRole)) {
        return json({ error: "Invalid role." }, 400);
      }

      await updateProfileWithFallback(adminClient, userId, { role: value });
      await syncUserRole(adminClient, userId, normalizedRole);
      return json({ ok: true });
    }

    if (action === "update_plan") {
      await syncPlanAccess(adminClient, userId, String(value || "").toLowerCase());
      return json({ ok: true });
    }

    if (action === "approve_dealer") {
      await updateProfileWithFallback(adminClient, userId, {
        role: "dealer",
        dealer_status: "approved",
      });
      await syncUserRole(adminClient, userId, "dealer");

      if (requestId && !String(requestId).startsWith("profile-")) {
        await updateByIdWithFallback(adminClient, "dealer_requests", String(requestId), {
          status: "approved",
        });
      }

      return json({ ok: true });
    }

    if (action === "reject_dealer") {
      await updateProfileWithFallback(adminClient, userId, {
        dealer_status: "rejected",
      });

      if (requestId && !String(requestId).startsWith("profile-")) {
        await updateByIdWithFallback(adminClient, "dealer_requests", String(requestId), {
          status: "rejected",
          rejection_reason: String(rejectionReason || ""),
        });
      }

      return json({ ok: true });
    }

    if (action === "toggle_ban") {
      const shouldBan = Boolean(value);
      await updateProfileWithFallback(adminClient, userId, {
        is_banned: shouldBan,
        banned_at: shouldBan ? new Date().toISOString() : null,
      });
      return json({ ok: true });
    }

    if (action === "delete_user") {
      await updateProfileWithFallback(adminClient, userId, {
        is_banned: true,
        deleted_at: new Date().toISOString(),
      });

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        return json({
          ok: true,
          warning: "Profile was blocked, but Auth user could not be deleted automatically.",
        });
      }

      const { error: profileDeleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileDeleteError) {
        return json({
          ok: true,
          warning: "Auth user was deleted. Profile was marked deleted but could not be removed because related records still exist.",
        });
      }

      return json({ ok: true });
    }

    return json({ error: "Invalid admin action." }, 400);
  } catch (error: any) {
    return json({ error: error?.message || "Admin action failed." }, 500);
  }
});
