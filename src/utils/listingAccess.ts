import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/utils/functionErrors";
import { getSubscriptionAccess, type SubscriptionAccess } from "@/utils/subscriptionAccess";

export type ListingAllowance = {
  access: SubscriptionAccess;
  activeListings: number;
  freeListingsUsed: number;
  paidListingCredits: number;
  includedLimit: number;
  canCreate: boolean;
  needsCredit: boolean;
  displayUsed: number;
  displayLimit: number;
};

export const getProfileForUser = async (userId: string) => {
  const byId = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!byId.error && byId.data) return byId.data;

  const byUserId = await (supabase as any)
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return byUserId.data;
};

export const getListingAllowance = async (userId: string): Promise<ListingAllowance> => {
  const profile = await getProfileForUser(userId);
  const role = String(profile?.role || "").toLowerCase();
  const fallbackPlan = role === "dealer" ? "dealer" : profile?.plan || "free";
  const access = await getSubscriptionAccess(userId, fallbackPlan);

  const { count } = await (supabase as any)
    .from("cars")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", userId)
    .neq("status", "sold");

  const activeListings = count || 0;
  const freeListingsUsed = Number(profile?.free_listings_used || 0);
  const paidListingCredits = Number(profile?.paid_listing_credits || 0);
  const plan = String(access.plan || fallbackPlan || "free").toLowerCase();
  const isSubscriptionPlan = plan === "garage" || plan === "dealer";
  const includedLimit = isSubscriptionPlan ? access.limit : 2;
  const canUseIncludedSlot = isSubscriptionPlan
    ? activeListings < includedLimit
    : freeListingsUsed < 2;
  const canCreate = access.allowed && (canUseIncludedSlot || paidListingCredits > 0);

  return {
    access,
    activeListings,
    freeListingsUsed,
    paidListingCredits,
    includedLimit,
    canCreate,
    needsCredit: access.allowed && !canUseIncludedSlot && paidListingCredits <= 0,
    displayUsed: isSubscriptionPlan ? activeListings : freeListingsUsed,
    displayLimit: includedLimit,
  };
};

export const consumeListingSlot = async (userId: string) => {
  const { data, error } = await (supabase as any).rpc("consume_listing_slot", {
    _user_id: userId,
  });

  if (error) throw error;
  if (data?.ok === false) throw new Error(data.reason || "Listing limit reached.");

  return data;
};

export const startListingCreditCheckout = async () => {
  const { data, error } = await supabase.functions.invoke("create-listing-credit-checkout");

  if (error) {
    throw new Error(await getFunctionErrorMessage(error, "Could not start checkout."));
  }

  if (data?.error) throw new Error(data.error);
  if (!data?.url) throw new Error("Could not start checkout.");
  window.location.href = data.url;
};
