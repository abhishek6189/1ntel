import { motion } from 'framer-motion';
import { Search, ClipboardCheck, CreditCard, Phone } from 'lucide-react';

const steps = [
  {
    icon: Search,
    title: 'Find Your Car',
    description: 'Browse listings from sellers across Canada with detailed filters.',
  },
  {
    icon: CreditCard,
    title: 'Pay for Inspection',
    description: 'Request a professional vehicle inspection and pay the inspection fee securely.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review Inspection Details',
    description: 'A certified inspector visits the vehicle and submits a detailed condition report.',
  },
  {
    icon: Phone,
    title: 'Connect with Seller',
    description: 'Once the car passes inspection, seller contact info is unlocked for you.',
  },
];

const HowItWorks = () => (
  <section id="how-it-works" className="py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-14"
      >
        <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          1ntel helps buyers and sellers connect with more confidence.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        {steps.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <step.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="text-xs font-bold text-primary mb-2">Step {i + 1}</div>
            <h3 className="font-heading font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorks;
