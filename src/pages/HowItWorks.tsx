import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Search,
  CreditCard,
  FileCheck,
  Phone,
  ShieldCheck,
  Shield,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import SEO from "@/components/SEO";

const steps = [
  {
    icon: Search,
    title: "Find Your Car",
    desc: "Browse verified listings from sellers across Canada. Use filters to narrow down by make, model, year, price, location, and more.",
    details: [
      "Search thousands of verified listings",
      "Filter by price, year, body type",
      "See inspection status at a glance",
    ],
  },
  {
    icon: CreditCard,
    title: "Request Inspection",
    desc: "Found a car you like? Request a professional vehicle inspection. Pay the inspection fee securely through our platform.",
    details: [
      "Professional certified inspectors",
      "Secure payment processing",
      "Typical turnaround: 2-3 business days",
    ],
  },
  {
    icon: FileCheck,
    title: "Get Verified Report",
    desc: "A certified inspector visits the vehicle and submits a detailed condition report covering mechanical, exterior, and interior condition.",
    details: [
      "200+ point inspection checklist",
      "Photo documentation included",
      "Mechanical & structural assessment",
    ],
  },
  {
    icon: Phone,
    title: "Connect with Seller",
    desc: "Once the car passes inspection, seller contact information is unlocked. Negotiate and complete the deal with confidence.",
    details: [
      "Seller contact info unlocked",
      "Moderated chat system",
      "Complete the deal with confidence",
    ],
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="How 1ntel Works"
        description="Learn how 1ntel helps Canadians browse used cars, list vehicles, connect with sellers, and use inspection support for safer car buying."
        path="/how-it-works"
      />
      <Navbar />

      {/* HERO */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            How 1ntel Works
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Our verification process protects both buyers and sellers from fraud.
            Every step is designed to give you peace of mind.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-10 sm:space-y-14 lg:space-y-16">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex flex-col md:flex-row items-start gap-5 sm:gap-8 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* ICON */}
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <div className="relative">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-7 w-7 sm:h-9 sm:w-9 text-primary" />
                  </div>

                  <span className="absolute -top-3 -right-3 h-7 w-7 sm:h-8 sm:w-8 bg-primary text-white text-xs sm:text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
              </div>

              {/* TEXT */}
              <div className="flex-1 text-center md:text-left min-w-0">
                <h3 className="text-lg sm:text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-4">{step.desc}</p>

                <ul className="space-y-2">
                  {step.details.map((d, j) => (
                    <li
                      key={j}
                      className="flex items-start md:items-center gap-2 text-left text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5 md:mt-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-12 sm:py-16 bg-card">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10">
            Why Choose 1ntel?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              {
                icon: ShieldCheck,
                title: "Trust & Safety",
                desc: "Every listing goes through verification. No hidden surprises.",
              },
              {
                icon: Shield,
                title: "Fraud Protection",
                desc: "Contact information is protected until inspection is complete.",
              },
              {
                icon: MessageSquare,
                title: "Moderated Chat",
                desc: "All communication is monitored to prevent scams.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="bg-background rounded-xl sm:rounded-2xl p-5 sm:p-8 border text-center"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>

                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 bg-primary text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to Start?
          </h2>

          <p className="text-sm sm:text-base text-white/85 mt-3">
            Browse verified cars or list your own today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link to="/browse" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:min-w-40">
                Browse Cars
              </Button>
            </Link>

            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:min-w-40 bg-white text-primary hover:bg-white/90"
              >
                Sell Your Car
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
