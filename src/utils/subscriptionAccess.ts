import { supabase } from "@/integrations/supabase/client";

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  individual: 2,
  garage: 10,
  dealer: 35,
};

const PAID_PLANS = new Set(["garage", "dealer"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const GRACE_STATUSES = new Set(["past_due", "unpaid", "incomplete"]);

export type SubscriptionAccess = {
  allowed: boolean;
  plan: string;
  limit: number;
  status: string;
  graceUntil: Date | null;
  reason?: string;
};

const addDays = (date: string | null | undefined, days: number) => {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + days);
  return value;
};

export const hasPaidListingAccess = (subscription: any, fallbackPlan = "free") => {
  const plan = String(subscription?.plan || fallbackPlan || "free").toLowerCase();
  const status = String(subscription?.status || (PAID_PLANS.has(plan) ? "missing" : "active")).toLowerCase();

  if (!PAID_PLANS.has(plan)) return true;
  if (ACTIVE_STATUSES.has(status)) return true;

  const graceUntil = addDays(subscription?.current_period_end, 7);
  return Boolean(GRACE_STATUSES.has(status) && graceUntil && graceUntil > new Date());
};

export const filterVisibleCarsForPublic = async <T extends { seller_id?: string | null }>(
  cars: T[]
) => {
  const sellerIds = Array.from(new Set(cars.map((car) => car.seller_id).filter(Boolean)));
  if (!sellerIds.length) return cars;

  const { data: profiles } = await (supabase as any)
    .from("profiles")
    .select("id, plan, is_banned")
    .in("id", sellerIds);

  const { data: subscriptions } = await (supabase as any)
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .in("user_id", sellerIds)
    .order("created_at", { ascending: false });

  const profilesById = new Map((profiles || []).map((profile: any) => [profile.id, profile]));
  const subscriptionsByUserId = new Map();
  for (const subscription of subscriptions || []) {
    if (!subscriptionsByUserId.has(subscription.user_id)) {
      subscriptionsByUserId.set(subscription.user_id, subscription);
    }
  }

  return cars.filter((car) => {
    const sellerId = car.seller_id || "";
    const profile = profilesById.get(sellerId) as any;
    if (profile?.is_banned) return false;

    const subscription = subscriptionsByUserId.get(sellerId);
    return hasPaidListingAccess(subscription, profile?.plan || "free");
  });
};

export const getSubscriptionAccess = async (
  userId: string,
  fallbackPlan = "free"
): Promise<SubscriptionAccess> => {
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = String(subscription?.plan || fallbackPlan || "free").toLowerCase();
  const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  const status = String(subscription?.status || (PAID_PLANS.has(plan) ? "missing" : "active")).toLowerCase();

  if (!PAID_PLANS.has(plan)) {
    return {
      allowed: true,
      plan,
      limit,
      status,
      graceUntil: null,
    };
  }

  if (ACTIVE_STATUSES.has(status)) {
    return {
      allowed: true,
      plan,
      limit,
      status,
      graceUntil: null,
    };
  }

  const graceUntil = addDays(subscription?.current_period_end, 7);
  const inGrace = GRACE_STATUSES.has(status) && graceUntil && graceUntil > new Date();

  if (inGrace) {
    return {
      allowed: true,
      plan,
      limit,
      status,
      graceUntil,
      reason: "Payment grace period",
    };
  }

  return {
    allowed: false,
    plan,
    limit,
    status,
    graceUntil,
    reason:
      status === "missing"
        ? "Subscription payment is required."
        : "Subscription payment is overdue.",
  };
};
