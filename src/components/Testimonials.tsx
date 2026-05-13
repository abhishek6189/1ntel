import { motion } from 'framer-motion';


const testimonials = [
  {
    name: 'Alex P.',
    location: 'Toronto, ON',
    text: 'The inspection report saved me from buying a car with hidden frame damage. Worth every penny.',
  },
  {
    name: 'Priya S.',
    location: 'Vancouver, BC',
    text: 'Sold my car in a week. The verification badge gave buyers real confidence to reach out.',
  },
  {
    name: 'Marc L.',
    location: 'Montreal, QC',
    text: 'Finally a car marketplace where I don\'t have to worry about scams. The moderated chat is brilliant.',
  },
];

const Testimonials = () => (
  <section className="py-12 sm:py-16 lg:py-20 px-4 sm:px-0">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8 sm:mb-12"
      >
        <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold mb-4">What Our Users Say</h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          className="glass rounded-xl p-5 sm:p-6"
          >
            <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
            <div>
              <p className="font-heading font-semibold text-sm">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.location}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
