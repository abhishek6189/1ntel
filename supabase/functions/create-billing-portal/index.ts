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

const getProfile = async (userId: string) => {
  const byId = await adminSupabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) return byId.data;

  const byUserId = await adminSupabase
    .from("profiles")
    .select("email")
    .eq("user_id", userId)
    .maybeSingle();

  return byUserId.data;
};

const getStripeCustomerId = async (userId: string, email?: string) => {
  const { data: subscription } = await adminSupabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id as string;
  }

  if (!email) return null;

  const customers = await stripe.customers.list({ email, limit: 10 });
  const matchingCustomer = customers.data.find((customer) => {
    const metadataUserId = customer.metadata?.user_id;
    return metadataUserId === userId || !metadataUserId;
  });

  return matchingCustomer?.id || null;
};

const sanitizeReturnPath = (value: unknown) => {
  const path = String(value || "").trim();
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
};

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

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const origin = req.headers.get("Origin") || "https://www.1ntel.ca";
    const returnPath = sanitizeReturnPath(body.return_path);
    const profile = await getProfile(userData.user.id);
    const email = cleanEmail((profile as any)?.email) || cleanEmail(userData.user.email);
    const customerId = await getStripeCustomerId(userData.user.id, email);

    if (!customerId) {
      return json({ error: "No billing profile found for this account." }, 404);
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}${returnPath}`,
    });

    return json({ url: portal.url });
  } catch (err: any) {
    return json({ error: err.message || "Could not open billing portal." }, 500);
  }
});
