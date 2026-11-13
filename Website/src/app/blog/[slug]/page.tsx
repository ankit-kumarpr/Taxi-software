import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, FileText } from "lucide-react";
import { BlogGetInTouch } from "@/components/blog/BlogGetInTouch";
import { FaqAccordion } from "@/components/blog/FaqAccordion";
import { MediaImage } from "@/components/common/MediaImage";
import { PageHero } from "@/components/common/PageHero";
import { getAllBlogSlugs, getPostBySlug } from "@/lib/blogs";
import { breadcrumbJsonLd, createMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 60;

type BlogPostPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return createMetadata({
      title: "Article Not Found",
      description: "The requested travel article could not be found.",
      path: `/blog/${slug}`,
    });
  }

  return createMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.image || undefined,
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) notFound();

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Blog", path: "/blog" },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      {post.schemaJson || post.schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: post.schemaJson || JSON.stringify(post.schema),
          }}
        />
      ) : null}
      {post.faqs?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(post.faqs)) }}
        />
      ) : null}

      <PageHero
        compact
        title={post.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: post.title },
        ]}
      />

      <article className="section-pad bg-bg-main">
        <div className="container-site">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-10">
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center gap-2.5 text-xs md:text-sm">
                {post.category ? (
                  <span className="rounded-full border border-orange/30 bg-orange/10 px-3 py-1 font-semibold uppercase tracking-wide text-orange">
                    {post.category}
                  </span>
                ) : null}
                {post.date ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-1 text-text-secondary">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    <time dateTime={post.date}>
                      {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
                        new Date(post.date)
                      )}
                    </time>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-1 text-text-secondary">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {post.readTime} read
                </span>
              </div>

              {post.image ? (
                <div className="relative mb-7 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border bg-black/30 shadow-lg shadow-black/20">
                  <MediaImage src={post.image} alt={post.title} fill priority />
                </div>
              ) : (
                <div className="mb-7 flex aspect-[16/9] items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card text-text-secondary/40">
                  <FileText className="h-14 w-14" aria-hidden />
                </div>
              )}

              <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm md:p-8">
                <div className="mb-7 rounded-xl border border-orange/25 bg-gradient-to-r from-orange/15 to-transparent px-4 py-3 text-sm leading-6 text-text-secondary">
                  Travel conditions can change. Check current road, weather and local guidance before
                  departure.
                </div>

                {post.contentHtml ? (
                  <div
                    className="blog-content"
                    dangerouslySetInnerHTML={{ __html: post.contentHtml }}
                  />
                ) : (
                  <p className="text-text-secondary">No content available.</p>
                )}
              </div>

              {post.otherImages?.length ? (
                <div className="mt-8">
                  <h2 className="mb-4 text-lg font-semibold text-white">Gallery</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {post.otherImages.map((src) => (
                      <div
                        key={src}
                        className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
                      >
                        <MediaImage src={src} alt="" fill />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {post.faqs?.length ? (
                <div className="mt-8">
                  <FaqAccordion items={post.faqs} />
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-orange hover:underline"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden /> Back to all articles
                </Link>
                <Link href="/contact" className="btn-orange px-5 py-2.5 text-sm">
                  Book a taxi
                </Link>
              </div>
            </div>

            <aside className="min-w-0 lg:max-w-[320px]">
              <BlogGetInTouch />
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
