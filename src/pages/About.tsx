import { Link } from "react-router-dom";
import { BadgeCheck, Car, MapPin, ShieldCheck } from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEO, { SITE_URL } from "@/components/SEO";
import { Button } from "@/components/ui/button";

const About = () => (
  <div className="min-h-screen bg-white">
    <SEO
      title="About 1ntel - Official 1ntel Car Marketplace"
      description="1ntel is the official Canadian used car marketplace at 1ntel.ca, built for buyers, private sellers, garages, and approved dealers."
      path="/about"
      structuredData={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "1ntel",
        alternateName: ["1ntel Canada", "1ntel Cars", "1ntel Marketplace"],
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description:
          "1ntel is a Canadian used car marketplace for buyers, private sellers, garages, and approved dealers.",
        areaServed: "CA",
        contactPoint: {
          "@type": "ContactPoint",
          telephone: "+1-437-860-7157",
          contactType: "customer support",
          areaServed: "CA",
        },
      }}
    />
    <Navbar />

    <main>
      <section className="border-b bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_0.8fr] lg:px-8 lg:py-20">
          <div>
            <p className="mb-3 text-sm font-semibold text-blue-600">Official 1ntel Website</p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              1ntel is a Canadian used car marketplace.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
              1ntel is spelled with the number 1 followed by n-t-e-l. The official
              1ntel website is 1ntel.ca, where buyers can browse used cars and
              sellers can list vehicles across Canada.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/browse">Browse Cars on 1ntel</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/blog/what-is-1ntel">What Is 1ntel?</Link>
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <img
              src="/car1.jpeg"
              alt="Used cars listed on the 1ntel marketplace"
              className="h-72 w-full object-cover lg:h-full"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Car,
              title: "Used Car Listings",
              copy: "Search vehicles by make, model, price, location, mileage, and seller type.",
            },
            {
              icon: BadgeCheck,
              title: "Seller Tools",
              copy: "Private sellers, garages, and approved dealers can manage vehicle listings.",
            },
            {
              icon: ShieldCheck,
              title: "Buyer Confidence",
              copy: "Clear details and inspection support help buyers make more informed decisions.",
            },
            {
              icon: MapPin,
              title: "Canada Focused",
              copy: "1ntel is built around used car buying and selling in Canada.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border bg-white p-5 shadow-sm">
              <item.icon className="mb-4 h-7 w-7 text-blue-600" />
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-slate-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-black">Search 1ntel to find 1ntel.ca.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            If you are looking for the Canadian car marketplace named 1ntel,
            use the official domain 1ntel.ca or search for 1ntel cars, 1ntel
            Canada, or 1ntel used cars.
          </p>
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default About;
