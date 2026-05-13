import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import CarCard from './CarCard';
import { mockCars } from '@/lib/mockData';

const FeaturedCars = () => {
  const featured = mockCars.filter(c => c.inspectionStatus === 'passed' || c.inspectionStatus === 'passed_with_issues').slice(0, 3);
  // Pad with other cars if not enough
  const display = featured.length >= 3 ? featured : [...featured, ...mockCars.filter(c => !featured.includes(c))].slice(0, 3);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-muted/50 px-4 sm:px-0">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Featured Verified Cars</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            These vehicles have passed our independent inspection and are ready for purchase.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto mb-8 sm:mb-10">
          {display.map((car, i) => (
            <CarCard key={car.id} car={car} index={i} />
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
            <Link to="/browse">View All Listings</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedCars;
