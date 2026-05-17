// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hashOtp = async (identifier: string, purpose: string, code: string) => {
  const secret = Deno.env.get("OTP_HASH_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const payload = `${identifier}:${purpose}:${code}:${secret}`;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const verifyEmailResetOtp = async (email: string, code: string) => {
  const { data: record, error } = await adminSupabase
    .from("verification_otps")
    .select("*")
    .eq("identifier", email)
    .eq("purpose", "password_reset")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!record) throw new Error("OTP expired or not found");
  if (Number(record.attempts || 0) >= 5) throw new Error("Too many OTP attempts");

  const incomingHash = await hashOtp(email, "password_reset", code);
  if (incomingHash !== record.otp_hash) {
    await adminSupabase
      .from("verification_otps")
      .update({ attempts: Number(record.attempts || 0) + 1 })
      .eq("id", record.id);
    throw new Error("Invalid OTP");
  }

  await adminSupabase
    .from("verification_otps")
    .update({ used_at: new Date().toISOString() })
    .eq("id", record.id);
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { channel, identifier, code, newPassword } = await req.json();
    const normalizedChannel = String(channel || "").trim().toLowerCase();
    const normalizedIdentifier = String(identifier || "").trim().toLowerCase();

    if (!["email", "phone"].includes(normalizedChannel)) return json({ error: "Invalid reset channel" }, 400);
    if (!normalizedIdentifier || String(newPassword || "").length < 6) {
      return json({ error: "Identifier and a 6 character password are required" }, 400);
    }

    if (normalizedChannel === "email") {
      await verifyEmailResetOtp(normalizedIdentifier, String(code || "").trim());
    }

    const queryColumn = normalizedChannel === "phone" ? "phone" : "email";
    const { data: profile, error: profileError } = await adminSupabase
      .from("profiles")
      .select("*")
      .eq(queryColumn, normalizedIdentifier)
      .maybeSingle();

    if (profileError) return json({ error: profileError.message }, 500);
    if (!profile) return json({ error: "No account was found for this information" }, 404);

    const userId = profile.user_id || profile.id;
    if (!userId) return json({ error: "Account is missing auth user id" }, 500);

    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, {
      password: String(newPassword),
    });

    if (updateError) return json({ error: updateError.message }, 500);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Password reset failed" }, 500);
  }
});
