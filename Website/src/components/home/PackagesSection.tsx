import Link from "next/link";
import { Gift } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { CardCtaActions } from "@/components/common/CardCtaActions";
import { formatINR } from "@/lib/utils";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { listPublishedPackages } from "@/lib/packages";

export async function PackagesSection() {
  const { packages } = await listPublishedPackages({ page: 1, limit: 4 });

  return (
    <section className="section-pad bg-bg-main">
      <div className="container-site">
        <SectionHeading
          eyebrow="Packages"
          title="Popular Tour Packages"
          description="Popular weekend getaways, city breaks and transfer packages across India."
        />
        {packages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-secondary">
            Packages will appear here once published from the CRM.
          </p>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {packages.map((pkg, i) => (
              <Reveal key={pkg.slug} delay={i * 0.05}>
                <article className="group grid overflow-hidden rounded-2xl border border-border bg-bg-card sm:grid-cols-[0.9fr_1.1fr]">
                  <Link
                    href={`/tour-packages/${pkg.slug}`}
                    className="relative block min-h-[180px] bg-black/30"
                  >
                    {pkg.image ? (
                      <MediaImage
                        src={pkg.image}
                        alt={pkg.title}
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-text-secondary/40">
                        <Gift className="h-8 w-8" />
                      </div>
                    )}
                  </Link>
                  <div className="flex flex-col p-5">
                    {pkg.duration ? (
                      <p className="text-xs font-semibold uppercase tracking-wider text-orange">
                        {pkg.duration}
                      </p>
                    ) : null}
                    <Link href={`/tour-packages/${pkg.slug}`}>
                      <h3 className="mt-1 text-xl font-bold text-white group-hover:text-orange">
                        {pkg.title}
                      </h3>
                    </Link>
                    <p className="mt-2 flex-1 text-sm text-text-secondary">{pkg.summary}</p>
                    {pkg.samplePriceFrom > 0 ? (
                      <p className="mt-3 text-sm font-bold text-orange">
                        From {formatINR(pkg.samplePriceFrom)}
                      </p>
                    ) : null}
                    <CardCtaActions
                      learnMoreHref={`/tour-packages/${pkg.slug}`}
                      learnMoreLabel="Learn more"
                      contextLabel={`Package: ${pkg.title}`}
                      compact
                    />
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/tour-packages" className="btn-outline-orange">
            Browse All Packages
          </Link>
        </div>
      </div>
    </section>
  );
}
