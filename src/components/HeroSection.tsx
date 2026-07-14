import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  ShieldCheck,
  Eye,
  BadgeCheck,
  Car
} from "lucide-react";
import { useState, useEffect } from "react";

const HeroSection = () => {

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const navigate = useNavigate();

  /* ================= CAROUSEL ================= */
  const [index, setIndex] = useState(0);

  const images = [
    "hero-marketplace-1.png",
    "hero-marketplace-2.png",
    "hero-marketplace-3.png",
  ];

  /* AUTO SLIDE */
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  /* ================= SWIPE ================= */
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: any) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: any) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      setIndex((prev) => (prev + 1) % images.length);
    }

    if (touchStart - touchEnd < -50) {
      setIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  /* ================= SEARCH ================= */
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const cleanQuery = trimmedQuery.replace(/[,%]/g, "");

    const timer = window.setTimeout(async () => {
      const { data, error } = await (supabase as any)
        .from("cars")
        .select("id, title, make, model, year, location")
        .or("status.is.null,status.eq.active")
        .or(
          `title.ilike.%${cleanQuery}%,make.ilike.%${cleanQuery}%,model.ilike.%${cleanQuery}%,location.ilike.%${cleanQuery}%`
        )
        .order("created_at", { ascending: false })
        .limit(6);

      if (cancelled) return;

      if (error) {
        setSuggestions([]);
        return;
      }

      const seen = new Set<string>();
      const uniqueSuggestions = (data || []).flatMap((car: any) => {
        const label = [car.year, car.make, car.model]
          .filter(Boolean)
          .join(" ")
          .trim() || car.title;
        const value = label || car.title || "";
        const key = value.toLowerCase();

        if (!value || seen.has(key)) return [];

        seen.add(key);
        return [{ ...car, label: value }];
      });

      setSuggestions(uniqueSuggestions);
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestionsOpen(false);
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden py-10 sm:py-16 lg:py-24">

      {/* BG */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent/5 blur-3xl rounded-full" />
      </div>

      <div className="container grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center px-4 sm:px-8 lg:px-8">

        {/* ================= LEFT ================= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex max-w-full items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-blue-600/10 text-blue-600 text-xs sm:text-sm mb-5 sm:mb-6">
            <ShieldCheck className="h-4 w-4" />
            <span className="truncate">Canada Used Car Marketplace</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-5 sm:mb-6 leading-tight">
            Buy Used Cars in Canada <br />
            <span className="text-[#00357a]">With More Confidence</span>
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-xl">
            Search used cars for sale in Toronto and across Canada. 1ntel helps buyers compare listings, talk to sellers, and review vehicle details before making a decision.
          </p>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 p-2 bg-white rounded-xl shadow">

              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input
                  placeholder="Search Toyota, Honda, SUV..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSuggestionsOpen(true);
                  }}
                  onFocus={() => setSuggestionsOpen(true)}
                  onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 120)}
                  className="pl-10 border-0"
                />

                {suggestionsOpen && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.65rem)] z-40 overflow-hidden rounded-xl border bg-white shadow-lg">
                    {suggestions.map((item) => (
                      <button
                        key={`${item.id}-${item.label}`}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setQuery(item.label);
                          setSuggestionsOpen(false);
                          navigate(`/browse?q=${encodeURIComponent(item.label)}`);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-blue-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-gray-900">
                            {item.label}
                          </span>
                          {item.location && (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {item.location}
                            </span>
                          )}
                        </span>
                        <Search className="h-4 w-4 shrink-0 text-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full lg:w-auto">
                <Search className="h-4 w-4 mr-1" /> Search
              </Button>

            </div>
          </form>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button className="w-full sm:w-auto" asChild>
              <Link to="/browse">Browse Used Cars</Link>
            </Button>

            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link to="/sell">Sell Your Car</Link>
            </Button>
          </div>
        </motion.div>

        {/* ================= RIGHT ================= */}
        <motion.div className="relative w-full">

          <div
            className="relative overflow-hidden rounded-xl sm:rounded-2xl shadow-xl h-[220px] sm:h-[300px] md:h-[380px]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >

            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className={`absolute inset-0 w-full h-full object-cover transition duration-700 ${
                  i === index ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}

            {/* LEFT */}
            <button
              onClick={() =>
                setIndex((prev) => (prev - 1 + images.length) % images.length)
              }
              className="hidden"
            >
              ←
            </button>

            {/* RIGHT */}
            <button
              onClick={() =>
                setIndex((prev) => (prev + 1) % images.length)
              }
              className="hidden"
            >
              →
            </button>

          </div>

        </motion.div>
      </div>

      {/* FEATURES */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16 lg:mt-20 max-w-5xl mx-auto px-4 sm:px-6">

        {[
          { icon: ShieldCheck, label: "Compare used cars in Canada" },
          { icon: Eye, label: "Sell your car privately"},
          { icon: BadgeCheck, label: "Vehicle details before you buy", desc: "" }
        ].map((item) => (
          <div
            key={item.label}
            className="flex gap-3 p-4 bg-white rounded-xl shadow min-w-0"
          >
            <item.icon className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}

      </div>

    </section>
  );
};

export default HeroSection;
