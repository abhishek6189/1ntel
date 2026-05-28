import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import FeaturedCars from '@/components/FeaturedCars';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import SEO, { SITE_URL } from '@/components/SEO';

const Index = () => (
  <div className="min-h-screen">
    <SEO
      title="1ntel - Buy and Sell Used Cars in Canada"
      description="Browse used cars, list your vehicle, and connect with buyers and sellers across Canada on 1ntel."
      path="/"
      structuredData={[
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "1ntel",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/browse?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@context": "https://schema.org",
          "@type": "AutoDealer",
          name: "1ntel",
          url: SITE_URL,
          image: `${SITE_URL}/logo.png`,
          telephone: "+1-437-860-7157",
          areaServed: "Canada",
        },
      ]}
    />
    <Navbar />
    <HeroSection />
    <FeaturedCars />
    <Testimonials />

    {/* CTA Section */}
    <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-0">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-xl sm:rounded-2xl p-6 sm:p-10 md:p-16 text-center max-w-3xl mx-auto"
        >
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of Canadians buying and selling cars with confidence through verified inspections.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto" asChild>
              <Link to="/browse">Browse Cars</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link to="/sell">List Your Car</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
