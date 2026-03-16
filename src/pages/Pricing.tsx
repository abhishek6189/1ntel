import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

const plans = [
  {
    name: 'Individual',
    price: 19,
    listings: 2,
    features: ['Up to 2 listings', 'Basic analytics', 'Email support', 'Inspection request alerts'],
    popular: false,
  },
  {
    name: 'Garage',
    price: 49,
    listings: 10,
    features: ['Up to 10 listings', 'Priority placement', 'Advanced analytics', 'Priority support', 'Inspection request alerts'],
    popular: true,
  },
  {
    name: 'Dealer',
    price: 99,
    listings: 30,
    features: ['Up to 30 listings', 'Featured placement', 'Full analytics suite', 'Dedicated support', 'Bulk listing tools', 'Custom branding'],
    popular: false,
  },
];

const Pricing = () => (
  <div className="min-h-screen">
    <Navbar />
    <div className="container py-20">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
        <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Seller Plans</h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Choose the plan that fits your needs. All plans include verified listing badges and secure payment processing.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass rounded-2xl p-8 relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <h3 className="font-heading text-xl font-bold mb-1">{plan.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-heading font-extrabold">${plan.price}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-success shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
              Get Started
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
    <Footer />
  </div>
);

export default Pricing;
