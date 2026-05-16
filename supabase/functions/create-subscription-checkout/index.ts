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
const adminSupabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const priceByPlan: Record<string, string | undefined> = {
  garage: Deno.env.get("STRIPE_GARAGE_PRICE_ID"),
  dealer: Deno.env.get("STRIPE_DEALER_PRICE_ID"),
};

const maxListingsByPlan: Record<string, number> = {
  garage: 10,
  dealer: 35,
};

const activeStatuses = new Set(["active", "trialing", "past_due"]);

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
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Login required" }, 401);
    }

    const { plan } = await req.json();
    const normalizedPlan = String(plan || "").trim().toLowerCase();
    const priceId = priceByPlan[normalizedPlan];

    if (!priceId || !maxListingsByPlan[normalizedPlan]) {
      return json({ error: "Invalid subscription plan" }, 400);
    }

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role, dealer_status, is_banned, plan")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profile?.is_banned) {
      return json({ error: "This account is banned. Please contact support." }, 403);
    }

    const role = String(profile?.role || "").toLowerCase();
    const dealerStatus = String(profile?.dealer_status || "").toLowerCase();

    if (normalizedPlan === "dealer" && (role !== "dealer" || dealerStatus !== "approved")) {
      return json({ error: "Dealer plan is only available after admin approval." }, 403);
    }

    if (normalizedPlan === "garage" && role === "dealer") {
      return json({ error: "Dealer accounts must use the dealer subscription." }, 403);
    }

    const { data: existingSubscription } = await adminSupabase
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingStatus = String(existingSubscription?.status || "").toLowerCase();
    if (existingSubscription && activeStatuses.has(existingStatus)) {
      const existingPlan = String(existingSubscription.plan || "").toLowerCase();
      if (existingPlan === normalizedPlan) {
        return json({ error: "You already have this plan active." }, 409);
      }

      return json({
        error: "You already have an active subscription. Please contact support to switch plans.",
      }, 409);
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

    return json({ url: session.url });
  } catch (err: any) {
    return json({ error: err.message || "Checkout failed" }, 500);
  }
});
