import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Car, CheckCircle, Sparkles, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { chooseBestSubscription } from "@/utils/subscriptionAccess";
import { startListingCreditCheckout } from "@/utils/listingAccess";
import SEO from "@/components/SEO";
import GlobalLoader from "@/components/GlobalLoader";

const plans = [
  {
    name: "Free",
    monthlyPrice: "$0",
    period: "/forever",
    desc: "For individuals selling 1-2 cars.",
    icon: Car,
    features: [
      "List up to 2 cars",
      "Basic listing with photos",
      "Moderated chat with buyers",
      "Inspection request support",
      "Standard listing visibility",
    ],
    cta: "Get Started Free",
    link: "/dashboard",
    checkoutPlan: null,
    highlighted: false,
  },
  {
    name: "Individual Listing",
    monthlyPrice: "$29",
    period: "/listing",
    desc: "For private sellers who need one more car listing.",
    icon: Sparkles,
    features: [
      "One additional listing credit",
      "Pay once per extra car",
      "Use after your 2 free lifetime listings",
      "Basic listing with photos",
      "Moderated chat with buyers",
    ],
    cta: "Buy Listing Credit",
    link: "/dashboard",
    checkoutPlan: "individual_listing",
    highlighted: true,
  },
  {
    name: "Garage",
    monthlyPrice: "$79",
    period: "/month",
    desc: "For enthusiasts and small sellers who need more.",
    icon: Star,
    features: [
      "List up to 10 cars",
      "Priority listing placement",
      "Moderated chat with buyers",
      "Inspection request support",
      "Enhanced listing visibility",
      "Performance analytics",
    ],
    cta: "Upgrade to Garage",
    link: "/dashboard",
    checkoutPlan: "garage",
    highlighted: false,
  },
  {
    name: "Dealer",
    monthlyPrice: "$249",
    period: "/month",
    desc: "For dealerships with high-volume listings.",
    icon: Building2,
    features: [
      "List up to 35 cars",
      "Apply for Featured placement",
      "Dedicated dealer dashboard",
      "Bulk listing management",
      "Priority support",
      "Advanced analytics",
      "Homepage featured spots",
    ],
    cta: "Dealer Sign Up",
    link: "/dealer-registration",
    checkoutPlan: "dealer",
    highlighted: false,
  },
];

const OnePlusMark = ({ onBlue = false }: { onBlue?: boolean }) => (
  <span className="inline-flex items-center gap-1.5">
    <span>1ntel</span>
    <svg
      viewBox="0 0 24 24"
      className={
        onBlue
          ? "h-4 w-4 drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]"
          : "h-4 w-4 drop-shadow-[0_0_4px_rgba(37,99,235,0.45)]"
      }
      aria-hidden="true"
    >
      <path
        d="M12 2.8C13.5 7.6 16.4 10.5 21.2 12C16.4 13.5 13.5 16.4 12 21.2C10.5 16.4 7.6 13.5 2.8 12C7.6 10.5 10.5 7.6 12 2.8Z"
        fill="none"
        stroke={onBlue ? "#ffffff" : "#2563eb"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
    </svg>
  </span>
);

export default function Pricing() {
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState("free");
  const [currentStatus, setCurrentStatus] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [dealerStatus, setDealerStatus] = useState("");
  const paidPlanActive = ["active", "trialing", "past_due"].includes(currentStatus);
  const isApprovedDealer = profileRole === "dealer" && dealerStatus === "approved";
  const visiblePlans = isApprovedDealer
    ? plans.filter((plan) => plan.checkoutPlan === "dealer")
    : plans.filter((plan) => plan.checkoutPlan !== "dealer");

  useEffect(() => {
    const loadCurrentPlan = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: profileById } = await supabase
        .from("profiles")
        .select("plan, role, dealer_status")
        .eq("id", user.id)
        .maybeSingle();
      const { data: profileByUserId } = await (supabase as any)
        .from("profiles")
        .select("plan, role, dealer_status")
        .eq("user_id", user.id)
        .maybeSingle();
      const profile = profileById || profileByUserId;
      const role = String((profile as any)?.role || "").toLowerCase();
      const status = String((profile as any)?.dealer_status || "").toLowerCase();
      const approvedDealer = role === "dealer" && status === "approved";

      setProfileRole(role);
      setDealerStatus(status);

      const { data: subscriptions } = await (supabase as any)
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const subscription = chooseBestSubscription(subscriptions || []);

      if (subscription?.plan) {
        setCurrentPlan(String(subscription.plan).toLowerCase());
        setCurrentStatus(String(subscription.status || "").toLowerCase());
        return;
      }

      setCurrentPlan(String(profile?.plan || "free").toLowerCase());
      setCurrentStatus("");
    };

    loadCurrentPlan();
  }, []);

  const startSubscriptionCheckout = async (plan: string) => {
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      toast.error(plan === "dealer" ? "Please sign up as a dealer first." : "Please log in before upgrading.");
      window.location.href = plan === "dealer" ? "/dealer-registration" : "/auth?mode=login";
      return;
    }

    if (plan === "dealer" && !isApprovedDealer) {
      toast.info("Please complete dealer signup and wait for admin approval first.");
      window.location.href = "/dealer-registration";
      return;
    }

    if (plan === "individual_listing") {
      try {
        setCheckoutPlan(plan);
        await startListingCreditCheckout();
      } catch (err: any) {
        toast.error(err?.message || "Could not start checkout.");
        setCheckoutPlan(null);
      }
      return;
    }

    if (paidPlanActive) {
      if (currentPlan === plan) {
        toast.info("This plan is already active on your account.");
      } else {
        toast.info("Please contact support to switch an active subscription.");
      }
      return;
    }

    try {
      setCheckoutPlan(plan);
      const { data, error } = await supabase.functions.invoke(
        "create-subscription-checkout",
        { body: { plan } }
      );

      if (error) {
        let message = error.message || "Could not start checkout.";
        try {
          const context = (error as any).context;
          const body = typeof context?.json === "function" ? await context.json() : null;
          message = body?.error || message;
        } catch {}
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("Could not start checkout.");

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Subscription checkout error:", err);
      toast.error(err?.message || "Could not start checkout.");
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <SEO
        title="Car Listing Pricing for Private Sellers and Garages"
        description="Compare 1ntel pricing for Canadian car sellers: free lifetime listings, one-time individual listing credits, and garage plans."
        path="/pricing"
      />
      <Navbar />

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-0 top-28 h-72 w-72 rounded-full bg-blue-100/50 blur-3xl" />
          <div className="absolute right-0 bottom-36 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
          <img
            src="/car1.jpeg"
            alt=""
            className="absolute left-8 top-64 hidden w-72 opacity-[0.045] grayscale lg:block"
          />
          <img
            src="/carr2.jpg"
            alt=""
            className="absolute right-0 bottom-64 hidden w-96 opacity-[0.055] grayscale lg:block"
          />
        </div>

        <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto mb-4 inline-flex items-center rounded-full bg-blue-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm">
                <OnePlusMark onBlue />
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
                Choose the right plan
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-600">
                Simple, transparent pricing for every seller.
              </p>

              <div className="mt-6 flex justify-center">
                <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  {isApprovedDealer
                    ? "Dealer plan is available after approval"
                    : "Buy extra listings one at a time when you need them"}
                </div>
              </div>
            </div>

            <div className={`mx-auto mt-10 grid gap-5 lg:items-center ${
              isApprovedDealer
                ? "max-w-md justify-center"
                : "max-w-6xl md:grid-cols-2 lg:grid-cols-3"
            }`}>
              {visiblePlans.map((plan) => {
                const checkoutPlanName = plan.checkoutPlan || "";
                const isDealerCheckout = plan.name === "Dealer";
                const isIndividualListing = checkoutPlanName === "individual_listing";
                const planName = plan.name.toLowerCase();
                const isFreePlan = planName === "free";
                const isGaragePlan = checkoutPlanName === "garage";
                const dealerCannotUseNonDealerPlan = isApprovedDealer && (isFreePlan || isGaragePlan);
                const isCurrentPlan =
                  !dealerCannotUseNonDealerPlan &&
                  currentPlan === planName &&
                  (plan.name === "Free" || paidPlanActive);
                const activeDifferentPaidPlan =
                  paidPlanActive && checkoutPlanName && !isIndividualListing && currentPlan !== checkoutPlanName;
                const disabled = Boolean(
                  checkoutPlan === checkoutPlanName ||
                    isCurrentPlan ||
                    activeDifferentPaidPlan ||
                    dealerCannotUseNonDealerPlan
                );
                const buttonLabel = isCurrentPlan
                  ? "Current Plan"
                    : dealerCannotUseNonDealerPlan || (isApprovedDealer && isFreePlan)
                    ? "Contact Support to Switch"
                  : activeDifferentPaidPlan
                    ? "Contact Support to Switch"
                    : isDealerCheckout && !isApprovedDealer
                      ? "Dealer Sign Up"
                      : isIndividualListing
                        ? plan.cta
                      : isDealerCheckout
                        ? "Start Dealer Plan"
                        : plan.cta;

                return (
                  <div
                    key={plan.name}
                    className={`relative flex min-h-full flex-col rounded-2xl border bg-white/90 p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl sm:p-6 ${
                      plan.highlighted
                        ? "border-blue-600 shadow-blue-100 lg:scale-[1.02]"
                        : "border-slate-200"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-b-2xl rounded-t-md bg-blue-600 px-8 py-2 text-sm font-semibold text-white shadow-lg">
                        <Star className="h-4 w-4" />
                        Most Popular
                      </div>
                    )}

                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
                      <plan.icon className="h-6 w-6" />
                    </div>

                    <h2 className="text-xl font-bold text-slate-950">{plan.name}</h2>
                    <p className="mt-2 min-h-10 text-sm leading-6 text-slate-600">
                      {plan.desc}
                    </p>

                    <div className="mt-5 flex items-end border-b border-slate-200 pb-5">
                      <span className="text-4xl font-extrabold tracking-tight text-slate-950">
                        {plan.monthlyPrice}
                      </span>
                      <span className="mb-1 ml-1 text-sm font-medium text-slate-500">
                        {plan.period}
                      </span>
                    </div>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-sm text-slate-700">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {plan.checkoutPlan ? (
                      <Button
                        size="lg"
                        variant={plan.highlighted ? "default" : "outline"}
                        className={`mt-7 h-11 w-full rounded-xl font-semibold ${
                          plan.highlighted
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                        disabled={disabled}
                        onClick={() => {
                          if (dealerCannotUseNonDealerPlan || (isApprovedDealer && isFreePlan)) {
                            toast.info("Dealer accounts cannot switch to this plan from here. Please contact support.");
                            return;
                          }
                          if (isDealerCheckout && !isApprovedDealer) {
                            window.location.href = "/dealer-registration";
                            return;
                          }
                          startSubscriptionCheckout(plan.checkoutPlan);
                        }}
                      >
                        {checkoutPlan === plan.checkoutPlan && (
                          <GlobalLoader className="mr-2 w-auto py-0" sizeClassName="h-7 w-7" />
                        )}
                        {buttonLabel}
                        {plan.highlighted && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        variant={plan.highlighted ? "default" : "outline"}
                        className={`mt-7 h-11 w-full rounded-xl font-semibold ${
                          plan.highlighted
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                        disabled={disabled}
                        onClick={() => {
                          if (dealerCannotUseNonDealerPlan) {
                            toast.info("Dealer accounts cannot switch to this plan from here. Please contact support.");
                            return;
                          }
                          window.location.href = plan.link;
                        }}
                      >
                        {buttonLabel}
                        {plan.highlighted && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
