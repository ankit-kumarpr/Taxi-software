import Link from "next/link";
import { ArrowRight, Clock, FileText } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { PageHero } from "@/components/common/PageHero";
import { listPublishedBlogs } from "@/lib/blogs";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = createMetadata({
  title: "India Taxi Travel Blog",
  description:
    "Read travel guides, route ideas and practical taxi tips for journeys across India.",
  path: "/blog",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Blog", path: "/blog" },
];

export default async function BlogPage() {
  const { posts } = await listPublishedBlogs({ page: 1, limit: 48 });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title="Travel Blog"
        description="Useful guides and planning ideas for taxi journeys across India."
        crumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card px-6 py-20 text-center">
              <FileText className="mb-3 h-10 w-10 text-text-secondary/50" aria-hidden />
              <p className="text-lg font-semibold text-white">No articles yet</p>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Published blogs from the CRM will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="overflow-hidden rounded-2xl border border-border bg-bg-card"
                >
                  <Link href={`/blog/${post.slug}`} className="group block">
                    <div className="relative aspect-[16/10] overflow-hidden bg-black/30">
                      {post.image ? (
                        <MediaImage
                          src={post.image}
                          alt={post.title}
                          fill
                          className="transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-text-secondary/40">
                          <FileText className="h-12 w-12" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold uppercase tracking-wide text-orange">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1 text-text-secondary">
                          <Clock className="h-3.5 w-3.5" aria-hidden />
                          {post.readTime}
                        </span>
                      </div>
                      <h2 className="mt-3 text-xl font-bold text-white group-hover:text-orange">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{post.excerpt}</p>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-orange">
                        Read article <ArrowRight className="h-4 w-4" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
