import Navbar from '@/components/Navbar';
import HeroSection from '@/components/HeroSection';
import HowItWorks from '@/components/HowItWorks';
import FeaturedCars from '@/components/FeaturedCars';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const Index = () => (
  <div className="min-h-screen">
    <Navbar />
    <HeroSection />
    <HowItWorks />
    <FeaturedCars />
    <Testimonials />

    {/* CTA Section */}
    <section className="py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-10 md:p-16 text-center max-w-3xl mx-auto"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join thousands of Canadians buying and selling cars with confidence through verified inspections.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/browse">Browse Cars</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
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
