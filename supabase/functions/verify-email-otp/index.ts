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

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code, purpose = "signup" } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPurpose = String(purpose || "signup").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) return json({ error: "Email and OTP are required" }, 400);

    const { data: record, error } = await adminSupabase
      .from("verification_otps")
      .select("*")
      .eq("identifier", normalizedEmail)
      .eq("purpose", normalizedPurpose)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return json({ error: error.message }, 500);
    if (!record) return json({ error: "OTP expired or not found" }, 400);
    if (Number(record.attempts || 0) >= 5) return json({ error: "Too many OTP attempts" }, 429);

    const incomingHash = await hashOtp(normalizedEmail, normalizedPurpose, normalizedCode);
    if (incomingHash !== record.otp_hash) {
      await adminSupabase
        .from("verification_otps")
        .update({ attempts: Number(record.attempts || 0) + 1 })
        .eq("id", record.id);
      return json({ error: "Invalid OTP" }, 400);
    }

    await adminSupabase
      .from("verification_otps")
      .update({ used_at: new Date().toISOString() })
      .eq("id", record.id);

    return json({ verified: true });
  } catch (err: any) {
    return json({ error: err.message || "Could not verify OTP" }, 500);
  }
});
