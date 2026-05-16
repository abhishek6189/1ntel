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

export const getSubscriptionAccess = async (
  userId: string,
  fallbackPlan = "free"
): Promise<SubscriptionAccess> => {
  const { data: subscription } = await (supabase as any)
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
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
