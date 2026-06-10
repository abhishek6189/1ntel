import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const distDir = process.env.SEO_DIST_DIR || join(process.cwd(), "dist");
const templatePath = join(distDir, "index.html");
const siteUrl = "https://www.1ntel.ca";
const siteName = "1ntel";
const defaultImage = `${siteUrl}/logo.png`;

const routes = [
  {
    path: "/about",
    title: "About 1ntel - Official 1ntel Car Marketplace | 1ntel",
    description:
      "1ntel is the official Canadian used car marketplace at 1ntel.ca, built for buyers, private sellers, garages, and approved dealers.",
  },
  {
    path: "/blog",
    title: "1ntel Blog - Used Car Buying and Selling Guides | 1ntel",
    description:
      "Read 1ntel guides about buying used cars in Canada, selling privately, avoiding scams, inspections, and using the 1ntel marketplace.",
  },
  {
    path: "/blog/what-is-1ntel",
    title: "What Is 1ntel? | 1ntel Blog",
    description:
      "Learn about 1ntel, the Canadian used car marketplace built for buyers, private sellers, garages, and approved dealers.",
    type: "article",
    image: `${siteUrl}/car1.jpeg`,
  },
  {
    path: "/blog/used-car-inspection-checklist-canada",
    title: "Used Car Inspection Checklist for Canada | 1ntel Blog",
    description:
      "A practical used car inspection checklist for Canadian buyers reviewing vehicle history, mileage, photos, tires, body condition, and seller details.",
    type: "article",
    image: `${siteUrl}/car2.jpeg`,
  },
  {
    path: "/blog/how-to-sell-your-car-privately-in-ontario",
    title: "How to Sell Your Car Privately in Ontario | 1ntel Blog",
    description:
      "Steps for selling a used car privately in Ontario, including pricing, photos, listing details, buyer messages, safety, and paperwork preparation.",
    type: "article",
    image: `${siteUrl}/carr2.jpg`,
  },
  {
    path: "/blog/avoid-used-car-scams-canada",
    title: "How to Avoid Used Car Scams in Canada | 1ntel Blog",
    description:
      "Safety tips for avoiding used car scams in Canada, including fake listings, suspicious deposits, payment pressure, and unclear seller information.",
    type: "article",
    image: `${siteUrl}/carr3%20(1).jpg`,
  },
  {
    path: "/browse",
    title: "Used Cars for Sale in Canada | 1ntel",
    description:
      "Browse used cars for sale in Toronto and across Canada. Filter by make, model, price, body type, transmission, fuel type, and location on 1ntel.",
  },
  {
    path: "/pricing",
    title: "Car Listing Pricing for Private Sellers and Garages | 1ntel",
    description:
      "Compare 1ntel pricing for Canadian car sellers: free lifetime listings, one-time individual listing credits, and garage plans.",
  },
  {
    path: "/how-it-works",
    title: "How 1ntel Works",
    description:
      "Learn how 1ntel helps Canadians browse used cars, list vehicles, connect with sellers, and use inspection support for safer car buying.",
  },
  {
    path: "/faq",
    title: "Car Buying and Selling FAQ | 1ntel",
    description:
      "Answers to common questions about buying, selling, listing credits, garage plans, dealer accounts, inspections, safety, and support on 1ntel.",
  },
  {
    path: "/contact",
    title: "Contact 1ntel",
    description:
      "Contact 1ntel for support with car listings, buyer questions, seller accounts, dealer registration, garage plans, and marketplace help.",
  },
  {
    path: "/dealer-registration",
    title: "Dealer Registration | 1ntel",
    description:
      "Apply for a 1ntel dealer account to list vehicles, manage inventory, receive leads, and use dealership tools in Canada.",
  },
  {
    path: "/auth",
    title: "Login | 1ntel",
    description:
      "Access your 1ntel account to manage saved cars, messages, listings, and marketplace settings.",
    robots: "noindex, nofollow",
  },
  {
    path: "/sell",
    title: "Login to Sell Your Car | 1ntel",
    description:
      "Log in to your 1ntel account to create and manage used car listings.",
    robots: "noindex, nofollow",
  },
  {
    path: "/dealer-auth",
    title: "Dealer Login | 1ntel",
    description:
      "Dealer account login for managing 1ntel inventory, leads, messages, and analytics.",
    robots: "noindex, nofollow",
  },
  {
    path: "/dealer-pending",
    title: "Dealer Application Pending | 1ntel",
    description:
      "Your 1ntel dealer application is pending review.",
    robots: "noindex, nofollow",
  },
];

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const routeToFile = (routePath) =>
  join(distDir, routePath.replace(/^\/+/, ""), "index.html");

const canonicalFor = (routePath) => `${siteUrl}${routePath === "/" ? "" : routePath}`;

const replaceTag = (html, pattern, replacement) =>
  pattern.test(html) ? html.replace(pattern, replacement) : html;

const applyRouteSeo = (html, route) => {
  const title = route.title.includes(siteName) ? route.title : `${route.title} | ${siteName}`;
  const description = route.description;
  const canonical = canonicalFor(route.path);
  const robots = route.robots || "index, follow";
  const image = route.image || defaultImage;
  const type = route.type || "website";

  let output = html;

  output = replaceTag(output, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
  output = replaceTag(
    output,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${robots}" />`
  );
  output = replaceTag(
    output,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${canonical}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(title)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${type}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${canonical}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${image}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${image}" />`
  );

  return output;
};

const template = await readFile(templatePath, "utf8");

await Promise.all(
  routes.map(async (route) => {
    const filePath = routeToFile(route.path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, applyRouteSeo(template, route));
  })
);

console.log(`Generated SEO HTML for ${routes.length} routes.`);
