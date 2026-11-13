import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, MapPin, XCircle } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { FaqAccordion } from "@/components/blog/FaqAccordion";
import { MediaImage } from "@/components/common/MediaImage";
import { PageHero } from "@/components/common/PageHero";
import { getAllPackageSlugs, getPackageBySlug } from "@/lib/packages";
import { breadcrumbJsonLd, createMetadata, faqJsonLd } from "@/lib/seo";
import { formatINR } from "@/lib/utils";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllPackageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) return {};

  const meta = createMetadata({
    title: pkg.metaTitle || pkg.title,
    description: pkg.metaDescription || pkg.summary,
    path: `/tour-packages/${slug}`,
    image: pkg.image || undefined,
  });

  if (pkg.canonical) {
    return {
      ...meta,
      alternates: { ...(meta.alternates || {}), canonical: pkg.canonical },
    };
  }
  return meta;
}

export default async function PackageDetailPage({ params }: Props) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const jsonLd = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Tour Packages", path: "/tour-packages" },
    { name: pkg.title, path: `/tour-packages/${slug}` },
  ]);

  const inclusions = pkg.includes?.length ? pkg.includes : pkg.inclusions;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {pkg.schemaJson || pkg.schema ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: pkg.schemaJson || JSON.stringify(pkg.schema),
          }}
        />
      ) : null}
      {pkg.faqs?.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(pkg.faqs)) }}
        />
      ) : null}

      <PageHero
        compact
        title={pkg.title}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Tour Packages", href: "/tour-packages" },
          { label: pkg.shortTitle || pkg.title },
        ]}
      />

      <main className="section-pad bg-bg-main">
        <div className="container-site grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:gap-10">
          <article className="min-w-0">
            {pkg.image ? (
              <div className="relative mb-7 aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-black/30">
                <MediaImage src={pkg.image} alt={pkg.title} fill priority />
              </div>
            ) : null}

            <div className="mb-6 flex flex-wrap gap-3 text-sm text-text-secondary">
              {pkg.duration ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-bg-card px-4 py-2">
                  <Clock className="h-4 w-4 text-orange" />
                  {pkg.duration}
                </span>
              ) : null}
              {pkg.destinations?.length ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-bg-card px-4 py-2">
                  <MapPin className="h-4 w-4 text-orange" />
                  {pkg.destinations.join(", ")}
                </span>
              ) : null}
            </div>

            {pkg.summary ? (
              <p className="mb-6 text-base leading-7 text-text-secondary">{pkg.summary}</p>
            ) : null}

            {pkg.samplePriceFrom > 0 ? (
              <p className="mb-6 rounded-xl border border-orange/30 bg-orange/10 p-4 text-text-secondary">
                <strong className="text-orange">
                  Package price from {formatINR(pkg.samplePriceFrom)}.
                </strong>{" "}
                Contact us to confirm pricing for your dates, group size and vehicle choice.
              </p>
            ) : null}

            <div className="rounded-2xl border border-border bg-bg-card p-5 md:p-8">
              {pkg.contentHtml ? (
                <div
                  className="blog-content"
                  dangerouslySetInnerHTML={{ __html: pkg.contentHtml }}
                />
              ) : (
                <p className="text-text-secondary">No content available.</p>
              )}
            </div>

            {(inclusions?.length || pkg.excludes?.length) ? (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {inclusions?.length ? (
                  <section className="rounded-2xl border border-border bg-bg-card p-5">
                    <h2 className="text-lg font-bold text-white">Included</h2>
                    <ul className="mt-4 space-y-3">
                      {inclusions.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm text-text-secondary">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange" aria-hidden />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                {pkg.excludes?.length ? (
                  <section className="rounded-2xl border border-border bg-bg-card p-5">
                    <h2 className="text-lg font-bold text-white">Not included</h2>
                    <ul className="mt-4 space-y-3">
                      {pkg.excludes.map((item) => (
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

            {pkg.otherImages?.length ? (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {pkg.otherImages.map((src) => (
                  <div
                    key={src}
                    className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border"
                  >
                    <MediaImage src={src} alt="" fill />
                  </div>
                ))}
              </div>
            ) : null}

            {pkg.faqs?.length ? (
              <div className="mt-8">
                <FaqAccordion items={pkg.faqs} />
              </div>
            ) : null}

            <Link
              href="/tour-packages"
              className="mt-8 inline-flex font-semibold text-orange hover:underline"
            >
              ← All packages
            </Link>
          </article>

          <aside aria-label="Request a package quote" className="lg:sticky lg:top-28">
            <BookingForm compact />
          </aside>
        </div>
      </main>
    </>
  );
}
