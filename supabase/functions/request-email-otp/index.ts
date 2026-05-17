// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
// @ts-ignore
import { Resend } from "npm:resend";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const createCode = () => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
};

const hashOtp = async (identifier: string, purpose: string, code: string) => {
  const secret = Deno.env.get("OTP_HASH_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const payload = `${identifier}:${purpose}:${code}:${secret}`;
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, purpose = "signup" } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedPurpose = String(purpose || "signup").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) return json({ error: "Valid email is required" }, 400);
    if (!["signup", "password_reset"].includes(normalizedPurpose)) {
      return json({ error: "Invalid OTP purpose" }, 400);
    }

    const code = createCode();
    const otpHash = await hashOtp(normalizedEmail, normalizedPurpose, code);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await adminSupabase.from("verification_otps").insert({
      identifier: normalizedEmail,
      purpose: normalizedPurpose,
      otp_hash: otpHash,
      expires_at: expiresAt,
    });

    if (insertError) return json({ error: insertError.message }, 500);

    const title = normalizedPurpose === "password_reset" ? "Password Reset OTP" : "Email Verification OTP";
    const { error: emailError } = await resend.emails.send({
      from: "1ntel <no-reply@mail.1ntel.ca>",
      to: normalizedEmail,
      subject: `1ntel ${title}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>1ntel ${title}</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing:6px">${code}</h1>
          <p>This code expires in 5 minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });

    if (emailError) return json({ error: emailError.message }, 400);

    return json({ success: true });
  } catch (err: any) {
    return json({ error: err.message || "Could not send OTP" }, 500);
  }
});
