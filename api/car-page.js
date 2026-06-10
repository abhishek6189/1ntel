const siteUrl = "https://www.1ntel.ca";
const siteName = "1ntel";
const defaultImage = `${siteUrl}/logo.png`;

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const replaceTag = (html, pattern, replacement) =>
  pattern.test(html) ? html.replace(pattern, replacement) : html;

const applyTagSeo = (html, seo) => {
  let output = html;

  output = replaceTag(output, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(seo.title)}</title>`);
  output = replaceTag(
    output,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="robots" content="${seo.robots || "index, follow"}" />`
  );
  output = replaceTag(
    output,
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
    `<link rel="canonical" href="${seo.canonical}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:type" content="${seo.type || "product"}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:url" content="${seo.canonical}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta property="og:image" content="${seo.image || defaultImage}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`
  );
  output = replaceTag(
    output,
    /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
    `<meta name="twitter:image" content="${seo.image || defaultImage}" />`
  );

  if (seo.structuredData) {
    output = output.replace(
      "</head>",
      `    <script type="application/ld+json">${JSON.stringify(seo.structuredData)}</script>\n  </head>`
    );
  }

  return output;
};

const getIndexHtml = async (req) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "www.1ntel.ca";
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const response = await fetch(`${protocol}://${host}/index.html`);

  if (!response.ok) {
    throw new Error(`Could not load index.html: ${response.status}`);
  }

  return response.text();
};

const getSupabaseRows = async (path, params = "") => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}${params}`, {
    headers: {
      apikey: supabaseKey,
      authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) return null;
  return response.json();
};

const buildCarTitle = (car) =>
  `${car.year || ""} ${car.make || ""} ${car.model || car.title || "Used Car"}`
    .replace(/\s+/g, " ")
    .trim();

export default async function handler(req, res) {
  const id = String(req.query.id || "").trim();
  const canonical = `${siteUrl}/car/${encodeURIComponent(id)}`;
  const indexHtml = await getIndexHtml(req);

  if (!id) {
    res.status(404).setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      applyTagSeo(indexHtml, {
        title: `Car Listing Not Found | ${siteName}`,
        description: "The requested 1ntel car listing could not be found.",
        canonical,
        robots: "noindex, nofollow",
      })
    );
    return;
  }

  const cars = await getSupabaseRows(
    "cars",
    `?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  );
  const car = Array.isArray(cars) ? cars[0] : null;

  if (!car || (car.status && car.status !== "active")) {
    res.status(404).setHeader("content-type", "text/html; charset=utf-8");
    res.end(
      applyTagSeo(indexHtml, {
        title: `Car Listing Not Found | ${siteName}`,
        description: "The requested 1ntel car listing could not be found.",
        canonical,
        robots: "noindex, nofollow",
      })
    );
    return;
  }

  const images =
    (await getSupabaseRows(
      "car_images",
      `?car_id=eq.${encodeURIComponent(id)}&select=image_url&order=sort_order.asc`
    )) || [];
  const imageUrls = images.map((image) => image.image_url).filter(Boolean);
  const fallbackImage = car.image_url ? [car.image_url] : [];
  const displayImages = imageUrls.length ? imageUrls : fallbackImage;
  const carTitle = buildCarTitle(car);
  const price = Number(car.price || 0);
  const description = `${carTitle} for sale in ${car.location || "Canada"} for $${price.toLocaleString("en-CA")}. View mileage, fuel type, photos, and seller details on 1ntel.`;

  const html = applyTagSeo(indexHtml, {
    title: `${carTitle} for Sale | ${siteName}`,
    description,
    canonical,
    image: displayImages[0] || defaultImage,
    type: "product",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Vehicle",
      name: carTitle,
      url: canonical,
      image: displayImages,
      brand: car.make,
      model: car.model,
      vehicleModelDate: car.year ? String(car.year) : undefined,
      mileageFromOdometer: car.mileage
        ? {
            "@type": "QuantitativeValue",
            value: Number(car.mileage),
            unitCode: "KMT",
          }
        : undefined,
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: "CAD",
        availability: "https://schema.org/InStock",
        url: canonical,
      },
    },
  });

  res
    .status(200)
    .setHeader("content-type", "text/html; charset=utf-8")
    .setHeader("cache-control", "public, s-maxage=300, stale-while-revalidate=3600");
  res.end(html);
}
