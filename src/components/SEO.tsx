import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://www.1ntel.ca";
const SITE_NAME = "1ntel";
const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

type SEOProps = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article" | "product";
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
};

const setMeta = (selector: string, attr: "content" | "href", value: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;

  if (!element) {
    if (selector.startsWith("link")) {
      element = document.createElement("link");
      element.setAttribute("rel", "canonical");
    } else {
      element = document.createElement("meta");
      const nameMatch = selector.match(/\[name="([^"]+)"\]/);
      const propertyMatch = selector.match(/\[property="([^"]+)"\]/);
      if (nameMatch) element.setAttribute("name", nameMatch[1]);
      if (propertyMatch) element.setAttribute("property", propertyMatch[1]);
    }
    document.head.appendChild(element);
  }

  element.setAttribute(attr, value);
};

const removeStructuredData = () => {
  document
    .querySelectorAll('script[data-seo-jsonld="true"]')
    .forEach((element) => element.remove());
};

const SEO = ({
  title,
  description,
  path,
  image = DEFAULT_IMAGE,
  type = "website",
  structuredData,
}: SEOProps) => {
  const location = useLocation();
  const canonicalPath = path || location.pathname;
  const canonicalUrl = `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;

  useEffect(() => {
    document.title = fullTitle;

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[name="author"]', "content", SITE_NAME);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);

    setMeta('meta[property="og:site_name"]', "content", SITE_NAME);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:type"]', "content", type);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:image"]', "content", image.startsWith("http") ? image : `${SITE_URL}${image}`);

    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", image.startsWith("http") ? image : `${SITE_URL}${image}`);

    removeStructuredData();

    if (structuredData) {
      const items = Array.isArray(structuredData) ? structuredData : [structuredData];
      items.forEach((item) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.dataset.seoJsonld = "true";
        script.text = JSON.stringify(item);
        document.head.appendChild(script);
      });
    }
  }, [canonicalUrl, description, fullTitle, image, structuredData, type]);

  return null;
};

export default SEO;
export { SITE_URL, SITE_NAME };
