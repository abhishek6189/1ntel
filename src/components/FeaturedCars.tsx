import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import CarCard from './CarCard';
import GlobalLoader from './GlobalLoader';
import { supabase } from '@/integrations/supabase/client';
import { filterVisibleCarsForPublic } from '@/utils/subscriptionAccess';

const FeaturedCars = () => {
  const [display, setDisplay] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const prepareCars = async (cars: any[] = []) => {
      const visibleCars = await filterVisibleCarsForPublic(cars);

      return visibleCars.slice(0, 3).map((car: any) => ({
        ...car,
        image_url: car.car_images?.[0]?.image_url || car.image_url,
      }));
    };

    const fetchCars = async () => {
      setLoading(true);

      const now = new Date().toISOString();
      const featuredRequest = (supabase as any)
        .from('cars')
        .select('*, car_images(image_url)')
        .eq('is_featured', true)
        .or('status.is.null,status.eq.active')
        .or(`featured_until.is.null,featured_until.gt.${now}`)
        .order('featured_until', { ascending: false, nullsFirst: false })
        .limit(9);

      const { data: featuredCars, error: featuredError } = await featuredRequest;
      let cars = featuredError ? [] : await prepareCars(featuredCars || []);

      if (!cars.length) {
        const { data: latestCars, error: latestError } = await (supabase as any)
          .from('cars')
          .select('*, car_images(image_url)')
          .or('status.is.null,status.eq.active')
          .order('created_at', { ascending: false })
          .limit(9);

        cars = latestError ? [] : await prepareCars(latestCars || []);
      }

      if (mounted) {
        setDisplay(cars);
        setLoading(false);
      }
    };

    fetchCars();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-muted/50 px-4 sm:px-0">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">Featured Cars</h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto">
            Browse featured inventory from trusted dealers.
          </p>
        </motion.div>

        {loading ? (
          <GlobalLoader />
        ) : display.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto mb-8 sm:mb-10">
            {display.map((car, i) => (
              <CarCard key={car.id} car={car} index={i} />
            ))}
          </div>
        ) : (
          <div className="mx-auto mb-8 max-w-2xl rounded-lg border bg-white p-8 text-center text-sm text-muted-foreground">
            Featured cars will appear here once active listings are available.
          </div>
        )}

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
