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

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_ANON_KEY") || ""
);

const priceByPlan: Record<string, string | undefined> = {
  garage: Deno.env.get("STRIPE_GARAGE_PRICE_ID"),
  dealer: Deno.env.get("STRIPE_DEALER_PRICE_ID"),
};

const maxListingsByPlan: Record<string, number> = {
  garage: 10,
  dealer: 35,
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Login required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan } = await req.json();
    const normalizedPlan = String(plan || "").trim().toLowerCase();
    const priceId = priceByPlan[normalizedPlan];

    if (!priceId || !maxListingsByPlan[normalizedPlan]) {
      return new Response(JSON.stringify({ error: "Invalid subscription plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("Origin") || "https://www.1ntel.ca";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: normalizedPlan === "dealer" ? 30 : undefined,
        metadata: {
          user_id: userData.user.id,
          plan: normalizedPlan,
          max_listings: String(maxListingsByPlan[normalizedPlan]),
        },
      },
      success_url: `${origin}/dashboard?subscription=success&plan=${normalizedPlan}`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
      customer_email: userData.user.email || undefined,
      client_reference_id: userData.user.id,
      metadata: {
        user_id: userData.user.id,
        plan: normalizedPlan,
        max_listings: String(maxListingsByPlan[normalizedPlan]),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Checkout failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
