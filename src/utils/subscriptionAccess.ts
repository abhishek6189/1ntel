import { supabase } from "@/integrations/supabase/client";

const PLAN_LIMITS: Record<string, number> = {
  free: 2,
  individual: 2,
  garage: 10,
  dealer: 35,
};

const PAID_PLANS = new Set(["garage", "dealer"]);
const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const PAYMENT_ACTION_STATUSES = new Set(["past_due", "unpaid", "incomplete", "trial_expired"]);
const RENEWAL_NOTICE_DAYS = 7;
const PAYMENT_GRACE_DAYS = 7;

const getSellerPlan = (profile: any, subscription: any) => {
  const role = String(profile?.role || "").toLowerCase();
  const plan = String(subscription?.plan || profile?.plan || "").toLowerCase();

  if (plan === "dealer" || role === "dealer") return "dealer";
  return "free";
};

export const getSellerPlanLabel = (plan: string | null | undefined) => {
  if (plan === "dealer") return "Dealer";
  return "Private Seller";
};

export type SubscriptionAccess = {
  allowed: boolean;
  plan: string;
  limit: number;
  status: string;
  graceUntil: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  daysUntilPeriodEnd: number | null;
  renewalDueSoon: boolean;
  paymentActionRequired: boolean;
  noticeTone: "info" | "warning" | "danger" | null;
  noticeTitle?: string;
  noticeBody?: string;
  noticeActionLabel?: string;
  reason?: string;
};

const addDays = (date: string | null | undefined, days: number) => {
  if (!date) return null;
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + days);
  return value;
};

const getDaysUntil = (date: Date | null) => {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
};

const getPlanLabel = (plan: string) => {
  if (plan === "dealer") return "Dealer";
  if (plan === "garage") return "Garage";
  return "Plan";
};

const formatBillingDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "the billing date";

const getPaymentGraceUntil = (subscription: any) => {
  return (
    addDays(subscription?.current_period_start, PAYMENT_GRACE_DAYS) ||
    addDays(subscription?.current_period_end, PAYMENT_GRACE_DAYS)
  );
};

const buildSubscriptionAccess = ({
  allowed,
  plan,
  limit,
  status,
  subscription,
  graceUntil = null,
  reason,
}: {
  allowed: boolean;
  plan: string;
  limit: number;
  status: string;
  subscription?: any;
  graceUntil?: Date | null;
  reason?: string;
}): SubscriptionAccess => {
  const currentPeriodStart = addDays(subscription?.current_period_start, 0);
  const currentPeriodEnd = addDays(subscription?.current_period_end, 0);
  const daysUntilPeriodEnd = getDaysUntil(currentPeriodEnd);
  const isPaidPlan = PAID_PLANS.has(plan);
  const isActive = ACTIVE_STATUSES.has(status);
  const paymentActionRequired = isPaidPlan && PAYMENT_ACTION_STATUSES.has(status);
  const renewalDueSoon = Boolean(
    isPaidPlan &&
      isActive &&
      daysUntilPeriodEnd !== null &&
      daysUntilPeriodEnd >= 0 &&
      daysUntilPeriodEnd <= RENEWAL_NOTICE_DAYS
  );
  const planLabel = getPlanLabel(plan);

  let noticeTone: SubscriptionAccess["noticeTone"] = null;
  let noticeTitle: string | undefined;
  let noticeBody: string | undefined;
  let noticeActionLabel: string | undefined;

  if (paymentActionRequired) {
    noticeTone = allowed ? "warning" : "danger";
    noticeTitle = allowed ? `${planLabel} payment needs attention` : `${planLabel} renewal required`;
    noticeBody = allowed
      ? `Your payment did not go through. Pay before ${formatBillingDate(graceUntil)} to keep listings live.`
      : reason || "Payment is overdue. Renew your plan to restore listings.";
    noticeActionLabel = allowed ? "Pay now" : "Renew now";
  } else if (renewalDueSoon) {
    noticeTone = "warning";
    noticeTitle =
      status === "trialing" ? `${planLabel} trial ends soon` : `${planLabel} plan renews soon`;
    noticeBody =
      status === "trialing"
        ? `Your trial ends on ${formatBillingDate(currentPeriodEnd)}. Add a valid payment method before then.`
        : `Your next automatic payment is on ${formatBillingDate(currentPeriodEnd)}. Make sure your payment method is up to date.`;
    noticeActionLabel = "Manage billing";
  }

  return {
    allowed,
    plan,
    limit,
    status,
    graceUntil,
    currentPeriodStart,
    currentPeriodEnd,
    daysUntilPeriodEnd,
    renewalDueSoon,
    paymentActionRequired,
    noticeTone,
    noticeTitle,
    noticeBody,
    noticeActionLabel,
    reason,
  };
};

const getSubscriptionRank = (subscription: any) => {
  const status = String(subscription?.status || "").toLowerCase();
  if (ACTIVE_STATUSES.has(status)) return 3;
  if (PAYMENT_ACTION_STATUSES.has(status)) return 2;
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
  const isCardlessTrial = status === "trialing" && !subscription?.stripe_subscription_id;
  const trialEnd = addDays(subscription?.current_period_end, 0);
  if (isCardlessTrial) return Boolean(trialEnd && trialEnd > new Date());
  if (ACTIVE_STATUSES.has(status)) return true;

  const graceUntil = getPaymentGraceUntil(subscription);
  return Boolean(PAYMENT_ACTION_STATUSES.has(status) && graceUntil && graceUntil > new Date());
};

export const filterVisibleCarsForPublic = async <T extends { seller_id?: string | null }>(
  cars: T[]
) => {
  const sellerIds = Array.from(new Set(cars.map((car) => car.seller_id).filter(Boolean)));
  if (!sellerIds.length) return cars;

  const profileRows: any[] = [];

  const byProfileId = await (supabase as any)
    .from("profiles")
    .select("id, plan, role, is_banned")
    .in("id", sellerIds);

  if (!byProfileId.error && byProfileId.data) {
    profileRows.push(...byProfileId.data);
  }

  const byUserId = await (supabase as any)
    .from("profiles")
    .select("id, user_id, plan, role, is_banned")
    .in("user_id", sellerIds);

  if (!byUserId.error && byUserId.data) {
    profileRows.push(...byUserId.data);
  }

  const { data: subscriptions } = await (supabase as any)
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .in("user_id", sellerIds)
    .order("created_at", { ascending: false });

  const profilesBySellerId = new Map<string, any>();
  for (const profile of profileRows) {
    if (profile.id) profilesBySellerId.set(profile.id, profile);
    if (profile.user_id) profilesBySellerId.set(profile.user_id, profile);
  }

  const subscriptionsByUserId = new Map<string, any[]>();
  for (const subscription of subscriptions || []) {
    const userSubscriptions = subscriptionsByUserId.get(subscription.user_id) || [];
    userSubscriptions.push(subscription);
    subscriptionsByUserId.set(subscription.user_id, userSubscriptions);
  }

  return cars.flatMap((car) => {
    const sellerId = car.seller_id || "";
    const profile = profilesBySellerId.get(sellerId) as any;
    if (profile?.is_banned) return [];

    const subscription = chooseBestSubscription(subscriptionsByUserId.get(sellerId) || []);
    const sellerPlan = getSellerPlan(profile, subscription);
    const enrichedCar = {
      ...car,
      seller_plan: sellerPlan,
      seller_plan_label: getSellerPlanLabel(sellerPlan),
    };

    if (!subscription) return [enrichedCar];

    return hasPaidListingAccess(subscription, profile?.plan || "free") ? [enrichedCar] : [];
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
  const isCardlessTrial = status === "trialing" && !subscription?.stripe_subscription_id;
  const cardlessTrialEnd = addDays(subscription?.current_period_end, 0);
  const cardlessTrialExpired = Boolean(
    isCardlessTrial && (!cardlessTrialEnd || cardlessTrialEnd <= new Date())
  );

  if (!PAID_PLANS.has(plan)) {
    return buildSubscriptionAccess({
      allowed: true,
      plan,
      limit,
      status,
      subscription,
    });
  }

  if (cardlessTrialExpired) {
    return buildSubscriptionAccess({
      allowed: false,
      plan,
      limit,
      status: "trial_expired",
      subscription,
      reason: "Your 30-day free trial has ended. Payment is required to continue listing vehicles.",
    });
  }

  if (ACTIVE_STATUSES.has(status)) {
    return buildSubscriptionAccess({
      allowed: true,
      plan,
      limit,
      status,
      subscription,
    });
  }

  const graceUntil = getPaymentGraceUntil(subscription);
  const inGrace = PAYMENT_ACTION_STATUSES.has(status) && graceUntil && graceUntil > new Date();

  if (inGrace) {
    return buildSubscriptionAccess({
      allowed: true,
      plan,
      limit,
      status,
      graceUntil,
      reason: "Payment grace period",
      subscription,
    });
  }

  return buildSubscriptionAccess({
    allowed: false,
    plan,
    limit,
    status,
    graceUntil,
    reason:
      status === "missing"
        ? "Subscription payment is required."
        : "Subscription payment is overdue.",
    subscription,
  });
};
