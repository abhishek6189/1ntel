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

    const { data: adminProfile, error: adminError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (adminError || String(adminProfile?.role || "").toLowerCase() !== "admin") {
      return json({ error: "Admin access required." }, 403);
    }

    const { action, userId, value } = await req.json();
    if (!userId || typeof userId !== "string") {
      return json({ error: "User id is required." }, 400);
    }

    if (userId === userData.user.id) {
      return json({ error: "You cannot change your own admin account here." }, 400);
    }

    if (action === "update_role") {
      await updateProfileWithFallback(adminClient, userId, { role: value });
      return json({ ok: true });
    }

    if (action === "update_plan") {
      await updateProfileWithFallback(adminClient, userId, { plan: value });
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
