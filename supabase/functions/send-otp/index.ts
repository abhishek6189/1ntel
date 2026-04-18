// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { Resend } from "npm:resend";

/* 🔥 INIT RESEND */
// @ts-ignore
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

/* 🔥 CORS (IMPORTANT for frontend calls) */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

serve(async (req: Request) => {
  /* ✅ PREFLIGHT FIX */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, code } = await req.json();

    /* ❌ VALIDATION */
    if (!email || !code) {
      return new Response(
        JSON.stringify({ error: "Email and OTP required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* 🔥 SEND EMAIL */
    const { error } = await resend.emails.send({
      from: "1ntel <no-reply@mail.1ntel.ca>", // Current Doamin name 
      to: email,
      subject: "Dealer Verification OTP",
      html: `
        <div style="font-family:sans-serif; text-align:center;">
          <h2>Dealer Verification</h2>
          <p>Your OTP Code</p>
          <h1 style="letter-spacing:5px;">${code}</h1>
          <p>This code is valid for 5 minutes.</p>
        </div>
      `
    });

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* ✅ SUCCESS */
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: corsHeaders }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});