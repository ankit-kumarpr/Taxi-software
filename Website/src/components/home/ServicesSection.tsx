import Link from "next/link";
import { Layers } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { CardCtaActions } from "@/components/common/CardCtaActions";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { listPublishedServices } from "@/lib/services";

export async function ServicesSection() {
  const { services } = await listPublishedServices({ page: 1, limit: 6 });

  return (
    <section className="section-pad bg-bg-main">
      <div className="container-site">
        <SectionHeading
          eyebrow="What We Offer"
          title="Our Taxi Services"
          description="Local rides, outstation trips, airport transfers and tour cabs across India."
        />
        {services.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-secondary">
            Services will appear here once published from the CRM.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.slug} delay={i * 0.05}>
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition hover:border-orange/50 hover:shadow-[0_0_0_1px_rgba(242,140,0,0.15)]">
                  <Link href={`/services/${service.slug}`} className="relative block aspect-[16/10] bg-black/30">
                    {service.image ? (
                      <MediaImage
                        src={service.image}
                        alt={service.title}
                        fill
                        className="transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-secondary/40">
                        <Layers className="h-8 w-8" />
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={`/services/${service.slug}`}>
                      <h3 className="text-lg font-bold text-white transition group-hover:text-orange">
                        {service.title}
                      </h3>
                    </Link>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                      {service.summary}
                    </p>
                    <CardCtaActions
                      learnMoreHref={`/services/${service.slug}`}
                      learnMoreLabel="Learn more"
                      contextLabel={`Service: ${service.title}`}
                      compact
                    />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
