// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import Stripe from "npm:stripe@14.25.0";
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const isSchemaMismatch = (error: any) => {
  const message = error?.message || "";
  return (
    message.includes("schema cache") ||
    message.includes("Could not find the") ||
    message.includes("column")
  );
};

const normalizeSubscriptionStatus = (status: string) => {
  if (status === "active" || status === "trialing") return status;
  if (status === "canceled" || status === "cancelled" || status === "incomplete_expired") {
    return "cancelled";
  }
  return "past_due";
};

const insertInspectionRequest = async (session: Stripe.Checkout.Session) => {
  const buyerId = session.metadata?.buyer_id;
  const carId = session.metadata?.car_id;

  if (!buyerId || !carId) return;

  const attempts = [
    {
      buyer_id: buyerId,
      car_id: carId,
      status: "paid",
      payment_amount: 50,
      stripe_payment_id: session.payment_intent as string,
    },
    {
      buyer_id: buyerId,
      car_id: carId,
      status: "paid",
      stripe_payment_id: session.payment_intent as string,
    },
    {
      user_id: buyerId,
      car_id: carId,
      status: "paid",
      payment_amount: 50,
      stripe_payment_id: session.payment_intent as string,
    },
    {
      user_id: buyerId,
      car_id: carId,
      status: "paid",
    },
    {
      buyer_id: buyerId,
      listing_id: carId,
      status: "paid",
      payment_amount: 50,
      stripe_payment_id: session.payment_intent as string,
    },
    {
      buyer_id: buyerId,
      listing_id: carId,
      status: "paid",
    },
  ];

  for (const payload of attempts) {
    const { error } = await supabase.from("inspection_requests").insert(payload);
    if (!error) return;
    if (!isSchemaMismatch(error)) throw error;
  }
};

const upsertSubscription = async (
  subscription: Stripe.Subscription,
  session?: Stripe.Checkout.Session
) => {
  const userId = subscription.metadata?.user_id || session?.metadata?.user_id;
  const plan = subscription.metadata?.plan || session?.metadata?.plan;
  const maxListings = Number(subscription.metadata?.max_listings || session?.metadata?.max_listings || 2);

  if (!userId || !plan) return;

  const payload = {
    user_id: userId,
    plan,
    status: normalizeSubscriptionStatus(subscription.status),
    stripe_customer_id: String(subscription.customer || ""),
    stripe_subscription_id: subscription.id,
    max_listings: maxListings,
    current_period_start: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(payload, { onConflict: "user_id" });

  if (error) throw error;

  await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", userId);
};

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing webhook signature or secret", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed: ${err.message}`, {
      status: 400,
    });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.mode === "payment") {
        await insertInspectionRequest(session);
      }

      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await upsertSubscription(subscription, session);
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await upsertSubscription(event.data.object as Stripe.Subscription);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Webhook failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
