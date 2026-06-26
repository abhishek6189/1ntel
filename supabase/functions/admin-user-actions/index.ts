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

const isAdminValue = (value: unknown) => String(value || "").trim().toLowerCase() === "admin";

const resolveTargetUser = async (adminClient: any, userId: string) => {
  const byId = await adminClient
    .from("profiles")
    .select("id, user_id")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) {
    return {
      profileId: byId.data.id,
      authId: byId.data.user_id || byId.data.id,
    };
  }

  const byUserId = await adminClient
    .from("profiles")
    .select("id, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!byUserId.error && byUserId.data) {
    return {
      profileId: byUserId.data.id,
      authId: byUserId.data.user_id || byUserId.data.id,
    };
  }

  return { profileId: userId, authId: userId };
};

const hasAdminAccess = async (adminClient: any, user: any) => {
  const metadataRoles = [
    user?.app_metadata?.role,
    user?.app_metadata?.user_role,
    user?.user_metadata?.role,
    user?.user_metadata?.user_role,
    ...(Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles : []),
  ];

  if (metadataRoles.some(isAdminValue)) return true;

  const profileChecks = [
    await adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    await adminClient.from("profiles").select("role").eq("user_id", user.id).maybeSingle(),
  ];

  const email = String(user.email || "").trim();
  if (email) {
    profileChecks.push(
      await adminClient.from("profiles").select("role").ilike("email", email).maybeSingle()
    );
  }

  if (profileChecks.some((result) => !result.error && isAdminValue(result.data?.role))) {
    return true;
  }

  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  if (!roleError && roleRows?.some((row: any) => isAdminValue(row.role))) {
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

const syncPlanAccess = async (
  adminClient: any,
  profileId: string,
  authId: string,
  plan: string
) => {
  const normalizedPlan = String(plan || "").toLowerCase();
  const allowedPlans = new Set(["free", "individual", "garage", "dealer"]);
  if (!allowedPlans.has(normalizedPlan)) throw new Error("Invalid plan.");

  await updateProfileWithFallback(adminClient, profileId, { plan: normalizedPlan });

  if (normalizedPlan === "free" || normalizedPlan === "individual") {
    const { error } = await adminClient
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", authId)
      .in("status", ["active", "trialing", "past_due"]);

    if (error) throw error;
    return;
  }

  const payload = {
    user_id: authId,
    plan: normalizedPlan,
    status: "active",
    max_listings: maxListingsForPlan(normalizedPlan),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const { data: existingSubscription, error: findError } = await adminClient
    .from("subscriptions")
    .select("id")
    .eq("user_id", authId)
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

    const targetUser = await resolveTargetUser(adminClient, userId);

    if (userId === userData.user.id || targetUser.authId === userData.user.id) {
      return json({ error: "You cannot change your own admin account here." }, 400);
    }

    if (action === "update_role") {
      const normalizedRole = String(value || "").toLowerCase();
      const allowedRoles = new Set(["buyer", "seller", "dealer", "inspector", "admin"]);
      if (!allowedRoles.has(normalizedRole)) {
        return json({ error: "Invalid role." }, 400);
      }

      await updateProfileWithFallback(adminClient, targetUser.profileId, { role: value });
      await syncUserRole(adminClient, targetUser.authId, normalizedRole);
      return json({ ok: true });
    }

    if (action === "update_plan") {
      await syncPlanAccess(
        adminClient,
        targetUser.profileId,
        targetUser.authId,
        String(value || "").toLowerCase()
      );
      return json({ ok: true });
    }

    if (action === "approve_dealer") {
      await updateProfileWithFallback(adminClient, targetUser.profileId, {
        role: "dealer",
        dealer_status: "approved",
      });
      await syncUserRole(adminClient, targetUser.authId, "dealer");

      if (requestId && !String(requestId).startsWith("profile-")) {
        await updateByIdWithFallback(adminClient, "dealer_requests", String(requestId), {
          status: "approved",
        });
      }

      return json({ ok: true });
    }

    if (action === "reject_dealer") {
      await updateProfileWithFallback(adminClient, targetUser.profileId, {
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
      await updateProfileWithFallback(adminClient, targetUser.profileId, {
        is_banned: shouldBan,
        banned_at: shouldBan ? new Date().toISOString() : null,
      });
      return json({ ok: true });
    }

    if (action === "delete_user") {
      await updateProfileWithFallback(adminClient, targetUser.profileId, {
        is_banned: true,
        deleted_at: new Date().toISOString(),
      });

      const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(targetUser.authId);
      if (authDeleteError) {
        return json({
          ok: true,
          warning: "Profile was blocked, but Auth user could not be deleted automatically.",
        });
      }

      const { error: profileDeleteError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", targetUser.profileId);

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
