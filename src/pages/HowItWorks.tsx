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
      <Navbar />

      {/* HERO */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold">How VerifyCar Works</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Our verification process protects both buyers and sellers from fraud.
            Every step is designed to give you peace of mind.
          </p>
        </div>
      </section>

      {/* STEPS */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <div className="space-y-16">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`flex flex-col md:flex-row items-start gap-8 ${
                i % 2 === 1 ? "md:flex-row-reverse" : ""
              }`}
            >
              {/* ICON */}
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <step.icon className="h-9 w-9 text-primary" />
                  </div>

                  <span className="absolute -top-3 -right-3 h-8 w-8 bg-primary text-white text-sm font-bold rounded-full flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
              </div>

              {/* TEXT */}
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-muted-foreground mb-4">{step.desc}</p>

                <ul className="space-y-2">
                  {step.details.map((d, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 bg-card">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">
            Why Choose VerifyCar?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
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
                className="bg-background rounded-2xl p-8 border text-center"
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
      <section className="py-16 bg-primary text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-white">
            Ready to Start?
          </h2>

          <p className="text-white/80 mt-3">
            Browse verified cars or list your own today.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link to="/browse">
              <Button size="lg" variant="secondary">
                Browse Cars
              </Button>
            </Link>

            <Link to="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
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