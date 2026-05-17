import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  BadgeCheck,
  FileText,
  Headphones,
  HeartHandshake,
  Home,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a href="/" className="inline-flex items-center">
            <BrandLogo className="text-5xl" />
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <a href="/browse" className="hover:text-blue-600">Browse Cars</a>
            <a href="/how-it-works" className="hover:text-blue-600">How It Works</a>
            <a href="/pricing" className="hover:text-blue-600">Dealer Plans</a>
            <a href="/contact" className="hover:text-blue-600">Contact</a>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <div className="flex h-10 w-64 items-center gap-2 rounded-lg border bg-white px-3 text-sm text-slate-500">
              <Search className="h-4 w-4" />
              Search cars, dealers, or VIN
            </div>
            <a href="/auth?mode=login" className="text-sm font-medium hover:text-blue-600">Sign In</a>
            <Button asChild>
              <a href="/auth?mode=signup">Sign Up</a>
            </Button>
          </div>

          <Button variant="outline" className="lg:hidden" asChild>
            <a href="/browse">
              <Search className="mr-2 h-4 w-4" />
              Browse
            </a>
          </Button>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-16">
            <div className="relative z-10 max-w-xl">
              <div className="mb-6 inline-flex rounded-md border border-blue-200 bg-white px-3 py-1 text-sm font-semibold text-blue-700">
                404
              </div>

              <h1 className="text-4xl font-black leading-tight sm:text-5xl">
                Wrong turn,
                <br />
                right marketplace.
              </h1>

              <p className="mt-7 text-7xl font-black leading-none sm:text-8xl">
                404
              </p>

              <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
                We could not find the page you are looking for. Let us get you
                back on track.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <a href="/">
                    <Home className="mr-2 h-4 w-4" />
                    Back to Home
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/browse">
                    <Search className="mr-2 h-4 w-4" />
                    Browse Cars
                  </a>
                </Button>
              </div>

              <div className="mt-8 max-w-md rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">Need help finding something?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Our team is here to help you.
                    </p>
                    <a href="/contact" className="mt-2 inline-block text-sm font-semibold text-blue-600">
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-slate-50 lg:min-h-[430px]">
              <div className="absolute inset-0 opacity-80">
                <svg className="h-full w-full" viewBox="0 0 760 460" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <pattern id="not-found-map-grid" width="56" height="56" patternUnits="userSpaceOnUse">
                      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#dbe4ef" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width="760" height="460" fill="url(#not-found-map-grid)" />
                  <path d="M34 110 C120 76 172 150 260 126 S421 64 520 104 S647 224 730 186" fill="none" stroke="#dbe4ef" strokeWidth="2" />
                  <path d="M62 318 C148 278 203 354 300 324 S480 238 590 304 S704 392 754 356" fill="none" stroke="#dbe4ef" strokeWidth="2" />
                  <path d="M210 20 L210 446 M430 0 L430 460 M650 0 L650 460" stroke="#e7edf5" strokeWidth="2" />
                </svg>
              </div>

              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-[86%] w-[62%] max-w-[360px]" viewBox="0 0 260 390" aria-hidden="true">
                  <path
                    d="M142 24 L91 55 L91 106 L143 134 L117 174 L147 214 L123 254 L160 296 L121 350"
                    fill="none"
                    stroke="#2563eb"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="10"
                  />
                  <circle cx="142" cy="24" r="22" fill="#2563eb" />
                  <text x="142" y="32" textAnchor="middle" fill="#fff" fontSize="24" fontWeight="700">1</text>
                  <path d="M121 334c-18 0-32 14-32 32 0 23 32 49 32 49s32-26 32-49c0-18-14-32-32-32z" fill="#2563eb" />
                  <circle cx="121" cy="366" r="12" fill="#fff" />
                </svg>
              </div>

              <div className="absolute left-12 top-9 hidden text-emerald-200 sm:block">
                <MapPin className="h-7 w-7" />
              </div>
              <div className="absolute right-14 top-20 hidden text-emerald-200 sm:block">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="absolute bottom-16 left-24 hidden text-emerald-200 sm:block">
                <MapPin className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-t-xl border-x border-t">
              <img
                src="/not-found-road.png"
                alt="Car driving through a mountain road"
                className="h-44 w-full object-cover sm:h-56"
              />
            </div>
          </div>
        </section>

        <section className="border-b border-t bg-white">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 py-7 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                icon: BadgeCheck,
                title: "Verified Dealers",
                copy: "Only verified and trusted dealers, across Canada.",
              },
              {
                icon: FileText,
                title: "Inspection Reports",
                copy: "Detailed reports for every listed vehicle.",
              },
              {
                icon: HeartHandshake,
                title: "Canada-Wide",
                copy: "Find your next car, from coast to coast.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 border-slate-200 md:border-r md:pr-6 last:border-r-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
