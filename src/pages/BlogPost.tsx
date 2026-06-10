import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEO, { SITE_URL } from "@/components/SEO";
import { getBlogPost } from "@/lib/blogPosts";
import NotFound from "@/pages/NotFound";

const BlogPost = () => {
  const { slug } = useParams();
  const post = getBlogPost(slug);

  if (!post) return <NotFound />;

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title={`${post.title} | 1ntel Blog`}
        description={post.description}
        path={`/blog/${post.slug}`}
        image={post.hero}
        type="article"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.description,
          image: `${SITE_URL}${post.hero}`,
          datePublished: post.datePublished,
          dateModified: post.dateModified,
          mainEntityOfPage: postUrl,
          author: {
            "@type": "Organization",
            name: "1ntel",
            url: SITE_URL,
          },
          publisher: {
            "@type": "Organization",
            name: "1ntel",
            logo: {
              "@type": "ImageObject",
              url: `${SITE_URL}/logo.png`,
            },
          },
        }}
      />
      <Navbar />

      <main>
        <article>
          <header className="border-b bg-slate-50">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
              <Link
                to="/blog"
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to 1ntel Blog
              </Link>

              <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                <span className="rounded bg-blue-50 px-2 py-1 text-blue-700">{post.category}</span>
                <span>{post.readTime}</span>
                <time dateTime={post.datePublished}>{post.datePublished}</time>
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
                {post.title}
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                {post.intro}
              </p>

              <div className="mt-8 overflow-hidden rounded-xl border bg-black shadow-sm">
                <img
                  src={post.hero}
                  alt={post.title}
                  className="h-auto max-h-[32rem] w-full object-contain"
                />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="space-y-10">
              {post.sections.map((section) => (
                <section key={section.heading}>
                  <h2 className="text-2xl font-bold text-slate-950">{section.heading}</h2>
                  <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
                    {section.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 rounded-lg border bg-slate-50 p-6">
              <h2 className="text-xl font-bold">Continue on 1ntel</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Browse active used car listings or learn more about the official
                1ntel marketplace.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/browse"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Browse Cars
                </Link>
                <Link
                  to="/about"
                  className="inline-flex h-10 items-center justify-center rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50"
                >
                  About 1ntel
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPost;
