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

const normalizeSubscriptionStatus = (status: string) => {
  if (status === "active" || status === "trialing") return status;
  if (status === "canceled" || status === "cancelled" || status === "incomplete_expired") {
    return "cancelled";
  }
  return "past_due";
};

const maxListingsForPlan = (plan: string) => {
  if (plan === "dealer") return 35;
  if (plan === "garage") return 10;
  return 2;
};

const normalizeEmail = (value: unknown) => String(value || "").trim().toLowerCase();
const normalizePhone = (value: unknown) => String(value || "").replace(/\D/g, "");

const getCurrentProfile = async (userId: string) => {
  const byId = await adminSupabase
    .from("profiles")
    .select("email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) return byId.data;

  const byUserId = await adminSupabase
    .from("profiles")
    .select("email, phone")
    .eq("user_id", userId)
    .maybeSingle();

  return byUserId.data;
};

const updateProfilePlan = async (userId: string, plan: string) => {
  const byId = await adminSupabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId)
    .select("id")
    .maybeSingle();
  if (!byId.error && byId.data) return;

  const byUserId = await adminSupabase
    .from("profiles")
    .update({ plan })
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (byUserId.error) throw byUserId.error;
};

const syncSubscription = async (
  subscription: Stripe.Subscription,
  session: Stripe.Checkout.Session,
  syncUserId?: string
) => {
  const userId =
    syncUserId ||
    subscription.metadata?.user_id ||
    session.metadata?.user_id ||
    session.client_reference_id;
  const plan = String(subscription.metadata?.plan || session.metadata?.plan || "").toLowerCase();

  if (!userId || !["garage", "dealer"].includes(plan)) {
    throw new Error("Checkout session is missing subscription metadata.");
  }

  const payload = {
    user_id: userId,
    plan,
    status: normalizeSubscriptionStatus(subscription.status),
    stripe_customer_id: String(subscription.customer || ""),
    stripe_subscription_id: subscription.id,
    max_listings: Number(
      subscription.metadata?.max_listings ||
        session.metadata?.max_listings ||
        maxListingsForPlan(plan)
    ),
    current_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  const { data: existingSubscription } = await adminSupabase
    .from("subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  const { error } = existingSubscription?.id
    ? await adminSupabase.from("subscriptions").update(payload).eq("id", existingSubscription.id)
    : await adminSupabase.from("subscriptions").insert(payload);

  if (error) throw error;
  await updateProfilePlan(userId, plan);

  return payload;
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

    const { session_id } = await req.json();
    const sessionId = String(session_id || "").trim();

    if (!sessionId) {
      return json({ error: "Checkout session id is required." }, 400);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    const sessionUserId = session.metadata?.user_id || session.client_reference_id;
    if (sessionUserId !== userData.user.id) {
      const profile = await getCurrentProfile(userData.user.id);
      const customerEmail =
        normalizeEmail(session.customer_details?.email) ||
        normalizeEmail((session as any).customer_email);
      const customerPhone = normalizePhone(session.customer_details?.phone);
      const profileEmail = normalizeEmail((profile as any)?.email || userData.user.email);
      const profilePhone = normalizePhone((profile as any)?.phone || userData.user.phone);
      const emailMatches = Boolean(profileEmail && customerEmail && profileEmail === customerEmail);
      const phoneMatches = Boolean(
        profilePhone &&
          customerPhone &&
          (profilePhone.endsWith(customerPhone) || customerPhone.endsWith(profilePhone))
      );

      if (!emailMatches && !phoneMatches) {
        return json({ error: "This checkout session does not belong to your logged-in account." }, 403);
      }
    }

    if (session.mode !== "subscription" || !session.subscription) {
      return json({ error: "This checkout session is not a subscription." }, 400);
    }

    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    const subscriptionStatus = String(subscription.status || "").toLowerCase();
    const paymentOk = ["active", "trialing"].includes(subscriptionStatus);

    if (!paymentOk) {
      return json({
        error: `This Stripe subscription is ${subscriptionStatus || "not active"}. Please complete payment before syncing this plan.`,
      }, 402);
    }

    const synced = await syncSubscription(subscription, session, userData.user.id);

    return json({ ok: true, subscription: synced });
  } catch (err: any) {
    console.error("sync-subscription-checkout failed", {
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
    });
    return json({ error: err.message || "Could not sync subscription." }, 500);
  }
});
