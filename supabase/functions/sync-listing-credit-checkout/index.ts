// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import Stripe from "npm:stripe@14.25.0";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

const userSupabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_ANON_KEY") || ""
);

const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userSupabase.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Login required" }, 401);
    }

    const { session_id } = await req.json();
    const sessionId = String(session_id || "").trim();
    if (!sessionId) return json({ error: "Checkout session id is required." }, 400);

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const sessionUserId = session.metadata?.user_id || session.client_reference_id;

    if (sessionUserId !== userData.user.id) {
      return json({ error: "This checkout session does not belong to your account." }, 403);
    }

    if (session.mode !== "payment" || session.metadata?.type !== "listing_credit") {
      return json({ error: "This checkout session is not an individual listing purchase." }, 400);
    }

    if (session.payment_status !== "paid") {
      return json({ error: "Payment is not complete yet." }, 402);
    }

    const credits = Number(session.metadata?.credits || 1);
    const { data, error } = await adminSupabase.rpc("record_listing_credit_payment", {
      _user_id: userData.user.id,
      _stripe_checkout_session_id: session.id,
      _stripe_payment_intent_id: session.payment_intent ? String(session.payment_intent) : null,
      _credits: Number.isFinite(credits) && credits > 0 ? credits : 1,
    });

    if (error) throw error;

    return json({ ok: true, credited: Boolean(data) });
  } catch (err: any) {
    return json({ error: err.message || "Could not sync listing credit." }, 500);
  }
});
