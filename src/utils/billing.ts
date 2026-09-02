import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/utils/functionErrors";

export const SUBSCRIPTION_PLANS = new Set(["garage", "dealer"]);
export const ACTIVE_BILLING_STATUSES = new Set(["active", "trialing"]);
export const PAYMENT_ACTION_STATUSES = new Set(["past_due", "unpaid", "incomplete", "trial_expired"]);

export const isSubscriptionPlan = (plan?: string | null) =>
  SUBSCRIPTION_PLANS.has(String(plan || "").toLowerCase());

export const isPaymentActionStatus = (status?: string | null) =>
  PAYMENT_ACTION_STATUSES.has(String(status || "").toLowerCase());

export const startSubscriptionCheckout = async (plan: string) => {
  const { data, error } = await supabase.functions.invoke("create-subscription-checkout", {
    body: { plan },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, "Could not start checkout."));
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Could not start checkout.");

  window.location.href = data.url;
};

export const openBillingPortal = async (returnPath = window.location.pathname) => {
  const { data, error } = await supabase.functions.invoke("create-billing-portal", {
    body: { return_path: returnPath },
  });

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, "Could not open billing."));
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Could not open billing.");

  window.location.href = data.url;
};
