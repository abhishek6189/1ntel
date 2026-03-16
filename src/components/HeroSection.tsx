import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShieldCheck,
  Eye,
  BadgeCheck,
  MapPin,
  Car
} from "lucide-react";
import { useState } from "react";

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent/5 blur-3xl rounded-full" />
      </div>

      <div className="container grid lg:grid-cols-2 gap-12 items-center">

        {/* LEFT SIDE CONTENT */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <ShieldCheck className="h-4 w-4" />
            Canada's Verified Car Marketplace
          </div>

          {/* Headline */}
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-[1.1] mb-6">
            Find Verified Cars. <br />
            <span className="text-gradient">Avoid Expensive Surprises.</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-8 max-w-xl">
            Every vehicle listed on VerifyCar goes through an independent
            inspection before buyers receive seller contact details. Buy with
            confidence and zero guesswork.
          </p>

          {/* SEARCH BAR */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 glass rounded-xl shadow-sm">

              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Make / Model"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 border-0 bg-transparent focus-visible:ring-0"
                />
              </div>

              <Input
                placeholder="Max Price"
                className="border-0 bg-transparent focus-visible:ring-0"
              />

              <Input
                placeholder="Year"
                className="border-0 bg-transparent focus-visible:ring-0"
              />

              <Button type="submit" className="flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search
              </Button>
            </div>
          </form>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/browse">Browse Verified Cars</Link>
            </Button>

            <Button size="lg" variant="outline" asChild>
              <Link to="/sell">Sell Your Car</Link>
            </Button>
          </div>
        </motion.div>

        {/* RIGHT SIDE VISUAL */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <img
            src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d"
            alt="Car showcase"
            className="rounded-2xl shadow-xl"
          />

          {/* Floating verification card */}
          <div className="absolute bottom-6 left-6 bg-white shadow-lg rounded-xl p-4 flex items-center gap-3">
            <ShieldCheck className="text-primary h-6 w-6" />
            <div>
              <p className="text-sm font-semibold">Inspection Verified</p>
              <p className="text-xs text-muted-foreground">
                Independent report available
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* TRUST FEATURES */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto px-6"
      >
        {[
          {
            icon: ShieldCheck,
            label: "Verified Inspections",
            desc: "Every vehicle independently checked"
          },
          {
            icon: Eye,
            label: "Protected Contact",
            desc: "Seller info unlocked after inspection"
          },
          {
            icon: BadgeCheck,
            label: "Fraud Prevention",
            desc: "Moderated buyer-seller communication"
          }
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm"
          >
            <item.icon className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </section>
  );
};

export default HeroSection;