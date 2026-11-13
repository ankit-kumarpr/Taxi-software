import Link from "next/link";
import { Layers } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { CardCtaActions } from "@/components/common/CardCtaActions";
import { PageHero } from "@/components/common/PageHero";
import { listPublishedServices } from "@/lib/services";
import { createMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = createMetadata({
  title: "Taxi Services Across India",
  description:
    "Explore TrueWay Taxi services for local, airport, outstation, leisure and corporate travel across India.",
  path: "/services",
});

export default async function ServicesPage() {
  const { services } = await listPublishedServices({ page: 1, limit: 48 });

  return (
    <>
      <PageHero
        title="Our Taxi Services"
        description="Flexible travel options for city rides, airport transfers, hill tours and longer journeys."
        crumbs={[{ label: "Home", href: "/" }, { label: "Services" }]}
      />
      <main className="section-pad bg-bg-main">
        <div className="container-site">
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card px-6 py-20 text-center">
              <Layers className="mb-3 h-10 w-10 text-text-secondary/50" aria-hidden />
              <p className="text-lg font-semibold text-white">No services published yet</p>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Published services from the CRM will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.slug}
                  className="flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-card"
                >
                  <Link
                    href={`/services/${service.slug}`}
                    className="relative block aspect-[16/10] bg-black/30"
                  >
                    {service.image ? (
                      <MediaImage src={service.image} alt={service.title} fill />
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-secondary/40">
                        <Layers className="h-10 w-10" aria-hidden />
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-6">
                    {service.shortTitle ? (
                      <p className="text-xs font-semibold uppercase tracking-wide text-orange">
                        {service.shortTitle}
                      </p>
                    ) : null}
                    <Link href={`/services/${service.slug}`}>
                      <h2 className="mt-2 text-xl font-bold text-text-main">{service.title}</h2>
                    </Link>
                    <p className="mt-3 flex-1 text-sm leading-6 text-text-secondary">
                      {service.summary}
                    </p>
                    <CardCtaActions
                      learnMoreHref={`/services/${service.slug}`}
                      learnMoreLabel="Learn more"
                      contextLabel={`Service: ${service.title}`}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
