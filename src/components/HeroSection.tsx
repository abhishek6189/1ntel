import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

  /* ================= CAROUSEL ================= */
  const [index, setIndex] = useState(0);

  const images = [
    "car1.jpeg",
    "carr2.jpg",
    "carr3 (1).jpg",
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
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/browse?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden py-20 lg:py-28">

      {/* BG */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-accent/5 blur-3xl rounded-full" />
      </div>

      <div className="container grid lg:grid-cols-2 gap-12 items-center">

        {/* ================= LEFT ================= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm mb-6">
            <ShieldCheck className="h-4 w-4" />
            Trusted Car Marketplace          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            Find Inspected Cars <br />
            <span className="text-blue-600">Avoid Scams</span>
          </h1>

          <p className="text-muted-foreground mb-8">
            Find the car you want to buy, use inspection report from 1ntel to understand the car before you buy and avoid expensive surprises  
          </p>

          {/* SEARCH */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 p-2 bg-white rounded-xl shadow">

              <div className="relative">
                <Car className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" />
                <Input
                  placeholder="Search car..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 border-0"
                />
              </div>

              <Input placeholder="Max Price" className="border-0" />
              <Input placeholder="Year" className="border-0" />

              <Button type="submit">
                <Search className="h-4 w-4 mr-1" /> Search
              </Button>

            </div>
          </form>

          <div className="flex gap-3">
            <Button asChild>
              <Link to="/browse">Browse Cars</Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/sell">Sell Car</Link>
            </Button>
          </div>
        </motion.div>

        {/* ================= RIGHT ================= */}
        <motion.div className="relative w-full">

          <div
            className="relative overflow-hidden rounded-2xl shadow-xl h-[250px] sm:h-[300px] md:h-[380px]"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full"
            >
              ←
            </button>

            {/* RIGHT */}
            <button
              onClick={() =>
                setIndex((prev) => (prev + 1) % images.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full"
            >
              →
            </button>

          </div>

          {/* VERIFIED CARD */}
          <div className="absolute bottom-4 left-4 bg-white shadow rounded-xl p-3 flex gap-2">
            <ShieldCheck className="text-blue-600" />
            <div>
              <p className="text-sm font-semibold">Verified</p>
              <p className="text-xs text-muted-foreground">100% Checked</p>
            </div>
          </div>

          {/* DOTS */}
          <div className="flex justify-center gap-2 mt-3">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === index ? "bg-blue-600 w-4" : "bg-gray-300"
                }`}
              />
            ))}
          </div>

        </motion.div>
      </div>

      {/* FEATURES */}
      <div className="grid md:grid-cols-3 gap-6 mt-20 max-w-5xl mx-auto px-6">

        {[
          { icon: ShieldCheck, label: "Live chats with sellers" },
          { icon: Eye, label: "Sell your car privately"},
          { icon: BadgeCheck, label: "Avoid fraud (or scams) through inspection report", desc: "" }
        ].map((item) => (
          <div
            key={item.label}
            className="flex gap-3 p-4 bg-white rounded-xl shadow"
          >
            <item.icon className="text-blue-600" />
            <div>
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          </div>
        ))}

      </div>

    </section>
  );
};

export default HeroSection;