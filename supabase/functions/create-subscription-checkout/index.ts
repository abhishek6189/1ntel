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

const dbActiveStatuses = new Set(["active", "trialing"]);
const dbRecoverableStatuses = new Set(["past_due"]);
const stripeRecoverableStatuses = new Set(["past_due", "unpaid", "incomplete"]);
const stripeBlockingStatuses = ["active", "trialing", "past_due", "unpaid", "incomplete"];
const cleanEmail = (value: unknown) => {
  const email = String(value || "").trim().toLowerCase();
  if (!email || email.includes("@phone.1ntel.local")) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const findProfileForUser = async (userId: string) => {
  const byId = await adminSupabase
    .from("profiles")
    .select("role, dealer_status, is_banned, plan, email, phone")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) return byId.data;

  const byUserId = await adminSupabase
    .from("profiles")
    .select("role, dealer_status, is_banned, plan, email, phone")
    .eq("user_id", userId)
    .maybeSingle();

  if (!byUserId.error && byUserId.data) return byUserId.data;

  return null;
};

const getExistingStripeCustomerId = async (userId: string, email?: string) => {
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

const ensureStripeCustomer = async (
  userId: string,
  plan: string,
  email?: string,
  phone?: string
) => {
  const existingCustomerId = await getExistingStripeCustomerId(userId, email);

  if (existingCustomerId) {
    const customer = await stripe.customers.update(existingCustomerId, {
      email,
      phone: phone || undefined,
      metadata: {
        user_id: userId,
        plan,
      },
    });
    return customer;
  }

  return stripe.customers.create({
    email,
    phone: phone || undefined,
    address: {
      country: "CA",
    },
    metadata: {
      user_id: userId,
      plan,
    },
  });
};

const findBlockingStripeSubscription = async (customerId: string) => {
  for (const status of stripeBlockingStatuses) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: status as Stripe.SubscriptionListParams.Status,
      limit: 1,
    });

    if (subscriptions.data[0]) return subscriptions.data[0];
  }

  return null;
};

const getSubscriptionPaymentUrl = async (
  subscription: Stripe.Subscription,
  origin: string,
  plan: string
) => {
  const expandedSubscription = await stripe.subscriptions.retrieve(subscription.id, {
    expand: ["latest_invoice"],
  });
  const latestInvoice =
    typeof expandedSubscription.latest_invoice === "object"
      ? expandedSubscription.latest_invoice
      : null;

  const hostedInvoiceUrl = (latestInvoice as any)?.hosted_invoice_url;
  if (hostedInvoiceUrl) {
    return hostedInvoiceUrl;
  }

  if (expandedSubscription.customer) {
    return getCustomerPortalUrl(String(expandedSubscription.customer), origin, plan);
  }

  return null;
};

const getCustomerPortalUrl = async (customerId: string, origin: string, plan: string) => {
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/${plan === "dealer" ? "dealer-dashboard" : "dashboard"}`,
  });
  return portal.url;
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
      return json({ error: "Login required" }, 401);
    }

    const { plan } = await req.json();
    const normalizedPlan = String(plan || "").trim().toLowerCase();
    const priceId = priceByPlan[normalizedPlan];

    if (!priceId || !maxListingsByPlan[normalizedPlan]) {
      return json({ error: "Invalid subscription plan" }, 400);
    }

    const profile = await findProfileForUser(userData.user.id);

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

    const origin = req.headers.get("Origin") || "https://www.1ntel.ca";

    const { data: existingSubscription } = await adminSupabase
      .from("subscriptions")
      .select("plan, status, stripe_customer_id, stripe_subscription_id, current_period_end")
      .eq("user_id", userData.user.id)
      .in("status", [...Array.from(dbActiveStatuses), ...Array.from(dbRecoverableStatuses)])
      .order("current_period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingStatus = String(existingSubscription?.status || "").toLowerCase();
    const cardlessTrialExpired = Boolean(
      existingSubscription &&
      existingStatus === "trialing" &&
      !existingSubscription.stripe_subscription_id &&
      (!existingSubscription.current_period_end ||
        new Date(existingSubscription.current_period_end).getTime() <= Date.now())
    );
    if (existingSubscription && !cardlessTrialExpired && (dbActiveStatuses.has(existingStatus) || dbRecoverableStatuses.has(existingStatus))) {
      const existingPlan = String(existingSubscription.plan || "").toLowerCase();
      if (existingPlan === normalizedPlan && dbRecoverableStatuses.has(existingStatus)) {
        const stripeSubscriptionId = String(existingSubscription.stripe_subscription_id || "");
        if (stripeSubscriptionId) {
          const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const url = await getSubscriptionPaymentUrl(stripeSubscription, origin, normalizedPlan);
          if (url) {
            return json({ url, recovery: true });
          }
        }

        const stripeCustomerId = String(existingSubscription.stripe_customer_id || "");
        if (stripeCustomerId) {
          return json({
            url: await getCustomerPortalUrl(stripeCustomerId, origin, normalizedPlan),
            recovery: true,
          });
        }

        return json({
          error: "Your subscription payment is overdue. Please contact support to restore billing for this plan.",
        }, 409);
      }

      if (existingPlan === normalizedPlan) {
        return json({ error: "You already have this plan active." }, 409);
      }

      return json({
        error: "You already have an active subscription. Please contact support to switch plans.",
      }, 409);
    }

    const customerEmail = cleanEmail(profile?.email) || cleanEmail(userData.user.email);
    const customer = await ensureStripeCustomer(
      userData.user.id,
      normalizedPlan,
      customerEmail,
      profile?.phone
    );
    const blockingSubscription = await findBlockingStripeSubscription(customer.id);

    if (blockingSubscription) {
      const blockingStatus = String(blockingSubscription.status || "").toLowerCase();
      const blockingPlan = String(blockingSubscription.metadata?.plan || "").toLowerCase();

      if (
        stripeRecoverableStatuses.has(blockingStatus) &&
        (!blockingPlan || blockingPlan === normalizedPlan)
      ) {
        const url = await getSubscriptionPaymentUrl(blockingSubscription, origin, normalizedPlan);
        if (url) {
          return json({ url, recovery: true });
        }
      }

      return json({
        error: "A Stripe subscription already exists for this account. Please wait a minute and refresh your dashboard, or contact support if it still does not activate.",
        stripe_subscription_id: blockingSubscription.id,
        stripe_status: blockingSubscription.status,
      }, 409);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_collection: "always",
      customer: customer.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          user_id: userData.user.id,
          plan: normalizedPlan,
          max_listings: String(maxListingsByPlan[normalizedPlan]),
        },
      },
      success_url: `${origin}/${normalizedPlan === "dealer" ? "dealer-dashboard" : "dashboard"}?subscription=success&plan=${normalizedPlan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?subscription=cancelled`,
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
