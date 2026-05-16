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

    const { carId, carTitle } = await req.json();

    if (!carId) {
      return json({ error: "Car ID is required" }, 400);
    }

    const { data: car } = await adminSupabase
      .from("cars")
      .select("id, seller_id, status, title")
      .eq("id", carId)
      .maybeSingle();

    if (!car || car.status === "sold") {
      return json({ error: "This listing is not available for inspection." }, 404);
    }

    if (car.seller_id === userData.user.id) {
      return json({ error: "You cannot request an inspection on your own listing." }, 403);
    }

    const duplicateAttempts = [
      { buyer_id: userData.user.id, car_id: carId },
      { user_id: userData.user.id, car_id: carId },
      { buyer_id: userData.user.id, listing_id: carId },
      { user_id: userData.user.id, listing_id: carId },
    ];

    for (const match of duplicateAttempts) {
      const { data: existing, error } = await adminSupabase
        .from("inspection_requests")
        .select("id")
        .match(match)
        .maybeSingle();

      if (!error && existing) {
        return json({ error: "You already requested an inspection for this car." }, 409);
      }
    }

    const priceId = Deno.env.get("STRIPE_INSPECTION_PRICE_ID");
    if (!priceId) {
      return json({ error: "Stripe inspection price is not configured" }, 500);
    }

    const origin = req.headers.get("Origin") || "https://www.1ntel.ca";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/car/${carId}?inspection=success`,
      cancel_url: `${origin}/car/${carId}?inspection=cancelled`,
      customer_email: userData.user.email || undefined,
      client_reference_id: `${userData.user.id}:${carId}`,
      metadata: {
        buyer_id: userData.user.id,
        car_id: carId,
        car_title: carTitle || car.title || "",
      },
    });

    return json({ url: session.url });
  } catch (err: any) {
    return json({ error: err.message || "Checkout failed" }, 500);
  }
});
