import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEO, { SITE_URL } from "@/components/SEO";
import { blogPosts } from "@/lib/blogPosts";

const Blog = () => (
  <div className="min-h-screen bg-white">
    <SEO
      title="1ntel Blog - Used Car Buying and Selling Guides"
      description="Read 1ntel guides about buying used cars in Canada, selling privately, avoiding scams, inspections, and using the 1ntel marketplace."
      path="/blog"
      structuredData={{
        "@context": "https://schema.org",
        "@type": "Blog",
        name: "1ntel Blog",
        url: `${SITE_URL}/blog`,
        publisher: {
          "@type": "Organization",
          name: "1ntel",
          logo: `${SITE_URL}/logo.png`,
        },
      }}
    />
    <Navbar />

    <main>
      <section className="border-b bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="mb-3 text-sm font-semibold text-blue-600">1ntel Blog</p>
          <h1 className="max-w-3xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
            Used car guides from 1ntel.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Practical 1ntel articles for Canadian used car buyers, private sellers,
            garages, and dealers.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {blogPosts.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <Link to={`/blog/${post.slug}`} className="block">
                <img
                  src={post.hero}
                  alt={post.title}
                  className="h-56 w-full object-cover"
                />
              </Link>
              <div className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">{post.category}</span>
                  <span>{post.readTime}</span>
                </div>
                <h2 className="text-2xl font-bold leading-tight">
                  <Link to={`/blog/${post.slug}`} className="hover:text-blue-600">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{post.description}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
                >
                  Read article
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>

    <Footer />
  </div>
);

export default Blog;
