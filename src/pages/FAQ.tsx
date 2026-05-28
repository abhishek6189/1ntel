import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEO from "@/components/SEO";

const faqGroups = [
  {
    title: "General",
    items: [
      {
        question: "What is 1ntel?",
        answer:
          "1ntel is a digital automotive marketplace that connects buyers, sellers, and independent vehicle inspectors, making used car transactions more transparent and reliable.",
      },
      {
        question: "How is 1ntel different from other car marketplaces?",
        answer:
          "1ntel lets buyers request independent vehicle inspections directly through the platform, reducing the risk of hidden issues and misinformation.",
      },
      {
        question: "Is 1ntel free to use?",
        answer:
          "Browsing listings is free. Sellers can post up to two listings for free, and additional listings are available through paid plans.",
      },
    ],
  },
  {
    title: "For Buyers",
    items: [
      {
        question: "How do I know if a car is reliable?",
        answer:
          "You can request an independent inspection through 1ntel to get a clear, unbiased report before making a decision. Some vehicles may already include inspection reports.",
      },
      {
        question: "Can I negotiate prices on 1ntel?",
        answer:
          "Yes. Buyers can communicate directly with sellers and negotiate transparently.",
      },
      {
        question: "What if the car has hidden problems?",
        answer:
          "Inspection reports provide detailed insight into the vehicle condition and help reduce risk. They should be used as a strong guide, not a guarantee.",
      },
    ],
  },
  {
    title: "For Sellers",
    items: [
      {
        question: "How do I list my car on 1ntel?",
        answer:
          "Create an account, upload your vehicle details and photos, and publish your listing.",
      },
      {
        question: "Is there a cost to list a car?",
        answer:
          "You can list up to two vehicles for free. Additional listings require a paid plan.",
      },
      {
        question: "Should I get my car inspected after or while listing?",
        answer:
          "It is optional, but highly recommended. An inspection can help attract more buyers, build trust, add an inspection badge, and help your car sell faster.",
      },
      {
        question: "How do I get paid?",
        answer: "Payment is handled directly between buyer and seller.",
      },
    ],
  },
  {
    title: "Inspections",
    items: [
      {
        question: "Who performs the inspections?",
        answer: "Independent, qualified vehicle inspectors partnered with 1ntel.",
      },
      {
        question: "What does an inspection include?",
        answer:
          "A detailed report covering mechanical condition, exterior and interior condition, signs of damage or wear, and overall vehicle health.",
      },
      {
        question: "Are inspections unbiased?",
        answer:
          "Yes. Inspectors operate independently to ensure fair and accurate evaluations.",
      },
    ],
  },
  {
    title: "Safety & Trust",
    items: [
      {
        question: "How does 1ntel reduce scams?",
        answer:
          "1ntel reduces risk by enabling independent inspections, promoting transparent communication, and giving buyers access to real vehicle condition data.",
      },
      {
        question: "Can I report a suspicious listing?",
        answer:
          "Yes. You can report any listing, and it will be reviewed by our team.",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        question: "How do I contact 1ntel?",
        answer:
          "You can reach 1ntel at 1ntelcarz@gmail.com or by phone at +1 437 860 7157.",
      },
      {
        question: "What if I have an issue during a transaction?",
        answer:
          "Our team is available to help guide you and resolve any concerns.",
      },
    ],
  },
];

const FAQ = () => (
  <div className="min-h-screen bg-gray-50">
    <SEO
      title="Car Buying and Selling FAQ"
      description="Answers to common questions about buying, selling, listing credits, garage plans, dealer accounts, inspections, safety, and support on 1ntel."
      path="/faq"
      structuredData={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqGroups.flatMap((group) =>
          group.items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          }))
        ),
      }}
    />
    <Navbar />

    <main className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="mb-10 text-center">
        <p className="mb-3 text-sm font-semibold text-blue-600">1ntel Support</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Quick answers about buying, selling, inspections, and safety on 1ntel.
        </p>
      </div>

      <div className="space-y-8">
        {faqGroups.map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-xl font-semibold">{group.title}</h2>
            <Accordion type="single" collapsible className="rounded-lg border bg-white px-4">
              {group.items.map((item) => (
                <AccordionItem key={item.question} value={item.question}>
                  <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>
    </main>

    <Footer />
  </div>
);

export default FAQ;
