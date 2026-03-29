import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Car, Building2, Star } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    desc: "Perfect for individuals selling 1-2 cars.",
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
    highlighted: false,
  },
  {
    name: "Garage",
    price: "$79.99",
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
    highlighted: true,
  },
  {
    name: "Dealer",
    price: "$249.99",
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
    link: "/dashboard",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* HERO */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-500 mt-4">
            Choose the plan that's right for you. No hidden fees.
          </p>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="py-16 max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">

          {plans.map((plan, i) => (
            <div
              key={i}
              className={`relative bg-white rounded-2xl border p-8 transition-all ${
                plan.highlighted
                  ? "border-blue-500 shadow-xl scale-105"
                  : "border-gray-200"
              }`}
            >

              {/* MOST POPULAR */}
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              {/* ICON */}
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                <plan.icon className="h-6 w-6 text-blue-600" />
              </div>

              {/* TITLE */}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>

              {/* PRICE */}
              <div className="mt-4 mb-6">
                <span className="text-4xl font-extrabold">
                  {plan.price}
                </span>
                <span className="text-gray-500 text-sm">
                  {plan.period}
                </span>
              </div>

              {/* FEATURES */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* BUTTON */}
              <Link to={plan.link}>
                <Button
                  className="w-full h-11"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}

        </div>
      </section>

      <Footer />
    </div>
  );
}