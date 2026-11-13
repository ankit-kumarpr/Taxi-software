import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/components/common/PageHero";
import { infoPages } from "@/data/info";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "India Taxi Travel Information",
  description:
    "Browse practical information about packing, safety and taxi travel across India.",
  path: "/info",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Travel Information", path: "/info" },
];

export default function InfoPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title="Travel Information"
        description="Simple planning resources for smoother taxi journeys."
        crumbs={[{ label: "Home", href: "/" }, { label: "Travel Information" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {infoPages.map((page) => (
            <article
              key={page.slug}
              className="flex flex-col rounded-2xl border border-border bg-bg-card p-6"
            >
              <h2 className="text-xl font-bold text-white">{page.title}</h2>
              <p className="mt-3 flex-1 leading-7 text-text-secondary">{page.summary}</p>
              <Link
                href={`/info/${page.slug}`}
                className="mt-6 inline-flex items-center gap-2 font-semibold text-orange"
              >
                Read guide <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
