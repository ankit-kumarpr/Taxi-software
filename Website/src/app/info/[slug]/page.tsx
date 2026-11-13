import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHero } from "@/components/common/PageHero";
import { getInfoBySlug, infoPages } from "@/data/info";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";

type InfoDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return infoPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: InfoDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getInfoBySlug(slug);

  if (!page) {
    return createMetadata({
      title: "Travel Guide Not Found",
      description: "The requested travel information page could not be found.",
      path: `/info/${slug}`,
    });
  }

  return createMetadata({
    title: page.title,
    description: page.summary,
    path: `/info/${page.slug}`,
  });
}

export default async function InfoDetailPage({ params }: InfoDetailPageProps) {
  const { slug } = await params;
  const page = getInfoBySlug(slug);

  if (!page) notFound();

  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Travel Information", path: "/info" },
    { name: page.title, path: `/info/${page.slug}` },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title={page.title}
        description={page.summary}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Travel Information", href: "/info" },
          { label: page.title },
        ]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site max-w-4xl">
          <div className="space-y-5">
            {page.sections.map((section, index) => (
              <section key={section.heading} className="rounded-2xl border border-border bg-bg-card p-6">
                <p className="text-sm font-semibold text-orange">0{index + 1}</p>
                <h2 className="mt-2 text-xl font-bold text-white">{section.heading}</h2>
                <p className="mt-3 leading-7 text-text-secondary">{section.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-6 text-sm text-text-secondary">
            Always check current route conditions and official guidance before travel.
          </p>
          <Link href="/info" className="mt-8 inline-flex items-center gap-2 font-semibold text-orange">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to travel information
          </Link>
        </div>
      </section>
    </>
  );
}
