import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { FaqAccordion } from "@/components/blog/FaqAccordion";
import { MediaImage } from "@/components/common/MediaImage";
import { PageHero } from "@/components/common/PageHero";
import { getAllServiceSlugs, getServiceBySlug } from "@/lib/services";
import { breadcrumbJsonLd, createMetadata, faqJsonLd } from "@/lib/seo";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return {};

  const meta = createMetadata({
    title: service.metaTitle || service.title,
    description: service.metaDescription || service.summary,
    path: `/services/${slug}`,
    image: service.image || undefined,
  });

  if (service.canonical) {
    return {
      ...meta,
      alternates: { ...(meta.alternates || {}), canonical: service.canonical },
    };
  }
  return meta;
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: service.title, path: `/services/${slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {service.schemaJson || service.schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: service.schemaJson || JSON.stringify(service.schema),
          }}
        />
      ) : null}
      {service.faqs?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(service.faqs)) }}
        />
      ) : null}

      <PageHero
        compact
        title={service.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Services", href: "/services" },
          { label: service.shortTitle || service.title },
        ]}
      />

      <main className="section-pad bg-bg-main">
        <div className="container-site grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
          <article className="min-w-0">
            {service.image ? (
              <div className="relative mb-7 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-black/30">
                <MediaImage src={service.image} alt={service.title} fill priority />
              </div>
            ) : null}

            {service.summary ? (
              <p className="mb-6 text-base leading-7 text-text-secondary">{service.summary}</p>
            ) : null}

            <div className="rounded-2xl border border-border bg-bg-card p-5 md:p-8">
              {service.contentHtml ? (
                <div
                  className="blog-content"
                  dangerouslySetInnerHTML={{ __html: service.contentHtml }}
                />
              ) : (
                <p className="text-text-secondary">No content available.</p>
              )}
            </div>

            {(service.includes?.length || service.excludes?.length) ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {service.includes?.length ? (
                  <section className="rounded-2xl border border-border bg-bg-card p-5">
                    <h2 className="text-lg font-bold text-white">Included</h2>
                    <ul className="mt-4 space-y-3">
                      {service.includes.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {service.excludes?.length ? (
                  <section className="rounded-2xl border border-border bg-bg-card p-5">
                    <h2 className="text-lg font-bold text-white">Not included</h2>
                    <ul className="mt-4 space-y-3">
                      {service.excludes.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
              </div>
            ) : null}

            {service.otherImages?.length ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {service.otherImages.map((src) => (
                  <div
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
                  >
                    <MediaImage src={src} alt="" fill />
                  </div>
                ))}
              </div>
            ) : null}

            {service.faqs?.length ? (
              <div className="mt-8">
                <FaqAccordion items={service.faqs} />
              </div>
            ) : null}

            <Link href="/services" className="mt-8 inline-flex font-semibold text-orange hover:underline">
              ← All services
            </Link>
          </article>

          <aside aria-label="Request a quote" className="lg:sticky lg:top-28">
            <BookingForm compact />
          </aside>
        </div>
      </main>
    </>
  );
}
