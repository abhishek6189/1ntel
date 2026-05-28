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
  currentPeriodEnd: Date | null;
  reason?: string;
};

const addDays = (date: string | null | undefined, days: number) => {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + days);
  return value;
};

const getSubscriptionRank = (subscription: any) => {
  const status = String(subscription?.status || "").toLowerCase();
  if (ACTIVE_STATUSES.has(status)) return 3;
  if (GRACE_STATUSES.has(status)) return 2;
  return 1;
};

const getPeriodTime = (subscription: any) => {
  const value = new Date(subscription?.current_period_end || subscription?.created_at || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export const chooseBestSubscription = (subscriptions: any[] = []) => {
  return [...subscriptions].sort((a, b) => {
    const rankDiff = getSubscriptionRank(b) - getSubscriptionRank(a);
    if (rankDiff) return rankDiff;
    return getPeriodTime(b) - getPeriodTime(a);
  })[0];
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
    .select("id, user_id, plan, is_banned")
    .or(`id.in.(${sellerIds.join(",")}),user_id.in.(${sellerIds.join(",")})`);

  const { data: subscriptions } = await (supabase as any)
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .in("user_id", sellerIds)
    .order("created_at", { ascending: false });

  const profilesBySellerId = new Map<string, any>();
  for (const profile of profiles || []) {
    if (profile.id) profilesBySellerId.set(profile.id, profile);
    if (profile.user_id) profilesBySellerId.set(profile.user_id, profile);
  }

  const subscriptionsByUserId = new Map<string, any[]>();
  for (const subscription of subscriptions || []) {
    const userSubscriptions = subscriptionsByUserId.get(subscription.user_id) || [];
    userSubscriptions.push(subscription);
    subscriptionsByUserId.set(subscription.user_id, userSubscriptions);
  }

  return cars.filter((car) => {
    const sellerId = car.seller_id || "";
    const profile = profilesBySellerId.get(sellerId) as any;
    if (profile?.is_banned) return false;

    const subscription = chooseBestSubscription(subscriptionsByUserId.get(sellerId) || []);
    if (!subscription) return true;

    return hasPaidListingAccess(subscription, profile?.plan || "free");
  });
};

export const getSubscriptionAccess = async (
  userId: string,
  fallbackPlan = "free"
): Promise<SubscriptionAccess> => {
  const { data: subscriptions } = await (supabase as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const subscription = chooseBestSubscription(subscriptions || []);

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
      currentPeriodEnd: addDays(subscription?.current_period_end, 0),
    };
  }

  if (ACTIVE_STATUSES.has(status)) {
    return {
      allowed: true,
      plan,
      limit,
      status,
      graceUntil: null,
      currentPeriodEnd: addDays(subscription?.current_period_end, 0),
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
      currentPeriodEnd: addDays(subscription?.current_period_end, 0),
      reason: "Payment grace period",
    };
  }

  return {
    allowed: false,
    plan,
    limit,
    status,
    graceUntil,
    currentPeriodEnd: addDays(subscription?.current_period_end, 0),
    reason:
      status === "missing"
        ? "Subscription payment is required."
        : "Subscription payment is overdue.",
  };
};
