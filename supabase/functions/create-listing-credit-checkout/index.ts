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

const cleanEmail = (value: unknown) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.includes("@phone.1ntel.local")) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const priceId = Deno.env.get("STRIPE_INDIVIDUAL_LISTING_PRICE_ID");
    if (!priceId) return json({ error: "Individual listing price is not configured." }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await userSupabase.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Login required" }, 401);
    }

    const { data: profileById } = await adminSupabase
      .from("profiles")
      .select("email, phone, is_banned")
      .eq("id", userData.user.id)
      .maybeSingle();

    const { data: profileByUserId } = await adminSupabase
      .from("profiles")
      .select("email, phone, is_banned")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const profile = profileById || profileByUserId;
    if (profile?.is_banned) {
      return json({ error: "This account is banned. Please contact support." }, 403);
    }

    const origin = req.headers.get("Origin") || "https://www.1ntel.ca";
    const email = cleanEmail((profile as any)?.email) || cleanEmail(userData.user.email);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?listing_credit=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?listing_credit=cancelled`,
      client_reference_id: userData.user.id,
      metadata: {
        type: "listing_credit",
        user_id: userData.user.id,
        credits: "1",
      },
      payment_intent_data: {
        metadata: {
          type: "listing_credit",
          user_id: userData.user.id,
          credits: "1",
        },
      },
    });

    return json({ url: session.url });
  } catch (err: any) {
    return json({ error: err.message || "Could not start listing checkout." }, 500);
  }
});
