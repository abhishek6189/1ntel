export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified: string;
  category: string;
  readTime: string;
  hero: string;
  intro: string;
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "what-is-1ntel",
    title: "What Is 1ntel?",
    description:
      "Learn about 1ntel, the Canadian used car marketplace built for buyers, private sellers, garages, and approved dealers.",
    datePublished: "2026-06-10",
    dateModified: "2026-06-10",
    category: "1ntel",
    readTime: "3 min read",
    hero: "/car1.jpeg",
    intro:
      "1ntel is a Canadian used car marketplace for people who want a clearer way to buy, sell, compare, and manage vehicle listings online.",
    sections: [
      {
        heading: "1ntel is a car marketplace",
        body: [
          "1ntel helps buyers browse used cars in Canada and gives sellers a place to list vehicles with photos, pricing, vehicle details, and location information.",
          "The platform is designed for private sellers, garages, and approved dealers who want a focused automotive marketplace rather than a general classified site.",
        ],
      },
      {
        heading: "How the 1ntel name is spelled",
        body: [
          "The brand name is 1ntel, spelled with the number 1 followed by n-t-e-l.",
          "When people search for 1ntel, they are looking for the official 1ntel car marketplace at 1ntel.ca.",
        ],
      },
      {
        heading: "What buyers can do on 1ntel",
        body: [
          "Buyers can search used cars, compare listing details, review photos, check mileage and fuel type, and contact sellers through the marketplace.",
          "1ntel is especially useful for shoppers comparing vehicles in Toronto and across Canada.",
        ],
      },
      {
        heading: "What sellers can do on 1ntel",
        body: [
          "Sellers can create listings, add vehicle information, upload photos, manage messages, and use account tools built around car selling.",
          "Approved dealers can use dealer-focused tools for inventory, leads, messages, and analytics.",
        ],
      },
    ],
  },
  {
    slug: "used-car-inspection-checklist-canada",
    title: "Used Car Inspection Checklist for Canada",
    description:
      "A practical used car inspection checklist for Canadian buyers reviewing vehicle history, mileage, photos, tires, body condition, and seller details.",
    datePublished: "2026-06-10",
    dateModified: "2026-06-10",
    category: "Buying Guide",
    readTime: "5 min read",
    hero: "/car2.jpeg",
    intro:
      "Before buying a used car in Canada, a careful inspection can help you avoid hidden costs and compare listings with more confidence.",
    sections: [
      {
        heading: "Start with the listing details",
        body: [
          "Check the year, make, model, mileage, fuel type, transmission, body type, location, and asking price before contacting the seller.",
          "On 1ntel, these details are shown in the listing so buyers can compare vehicles more quickly.",
        ],
      },
      {
        heading: "Review photos carefully",
        body: [
          "Look for clear exterior, interior, dashboard, tire, and damage-area photos. Missing or low-quality photos are a reason to ask follow-up questions.",
          "Compare the photos with the written description and make sure the condition appears consistent.",
        ],
      },
      {
        heading: "Ask about maintenance and history",
        body: [
          "Ask whether the seller has service records, accident history, ownership history, and recent repair details.",
          "For higher-value purchases, consider an independent inspection before committing.",
        ],
      },
      {
        heading: "Check common wear items",
        body: [
          "Tires, brakes, lights, suspension noises, dashboard warnings, windshield cracks, rust, and fluid leaks are common used-car inspection points.",
          "If anything feels unclear, pause and get more information before sending a deposit.",
        ],
      },
    ],
  },
  {
    slug: "how-to-sell-your-car-privately-in-ontario",
    title: "How to Sell Your Car Privately in Ontario",
    description:
      "Steps for selling a used car privately in Ontario, including pricing, photos, listing details, buyer messages, safety, and paperwork preparation.",
    datePublished: "2026-06-10",
    dateModified: "2026-06-10",
    category: "Selling Guide",
    readTime: "5 min read",
    hero: "/carr2.jpg",
    intro:
      "Selling your car privately in Ontario can help you reach serious buyers, but the listing needs clear details, strong photos, and a safe process.",
    sections: [
      {
        heading: "Prepare accurate vehicle details",
        body: [
          "Write down the year, make, model, trim, mileage, transmission, fuel type, drivetrain, body type, colour, and location.",
          "Accurate details help buyers find your vehicle when they search and reduce repeated questions.",
        ],
      },
      {
        heading: "Take useful photos",
        body: [
          "Use daylight and include front, rear, sides, wheels, interior, dashboard, odometer, cargo area, and any visible damage.",
          "A clear photo set can make a private listing look more trustworthy and complete.",
        ],
      },
      {
        heading: "Price the car realistically",
        body: [
          "Compare similar vehicles by year, mileage, condition, location, and seller type before choosing a price.",
          "A realistic price can attract better conversations and reduce time wasted on low-quality leads.",
        ],
      },
      {
        heading: "Use a focused marketplace",
        body: [
          "Listing your car on 1ntel gives buyers a car-focused place to compare vehicles and contact sellers.",
          "Keep communication clear and avoid sharing sensitive personal information until you are comfortable with the buyer.",
        ],
      },
    ],
  },
  {
    slug: "avoid-used-car-scams-canada",
    title: "How to Avoid Used Car Scams in Canada",
    description:
      "Safety tips for avoiding used car scams in Canada, including fake listings, suspicious deposits, payment pressure, and unclear seller information.",
    datePublished: "2026-06-10",
    dateModified: "2026-06-10",
    category: "Safety",
    readTime: "4 min read",
    hero: "/carr3 (1).jpg",
    intro:
      "Used car scams can happen on any marketplace, but a careful process helps buyers and sellers spot red flags earlier.",
    sections: [
      {
        heading: "Watch for unrealistic prices",
        body: [
          "If a vehicle is priced far below similar listings, ask why. A very low price can be a sign of hidden issues or a fake listing.",
          "Compare mileage, year, trim, location, and condition before assuming a listing is a deal.",
        ],
      },
      {
        heading: "Be careful with deposits",
        body: [
          "Avoid sending deposits before you have enough information about the vehicle and seller.",
          "Pressure to pay immediately, refusal to answer questions, or vague ownership details should slow the process down.",
        ],
      },
      {
        heading: "Check the vehicle details",
        body: [
          "Ask for clear photos, ownership details, service information, and any available history before arranging next steps.",
          "If the seller avoids basic questions, consider another vehicle.",
        ],
      },
      {
        heading: "Use marketplace tools wisely",
        body: [
          "1ntel gives buyers and sellers a focused place to compare listings and communicate around vehicle details.",
          "Trust your judgment and ask for more information when something feels incomplete.",
        ],
      },
    ],
  },
];

export const getBlogPost = (slug?: string) =>
  blogPosts.find((post) => post.slug === slug);
