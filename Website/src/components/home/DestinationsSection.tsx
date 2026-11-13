import Link from "next/link";
import { Clock, Gift, MapPin } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { CardCtaActions } from "@/components/common/CardCtaActions";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { listPublishedPackages } from "@/lib/packages";
import { formatINR } from "@/lib/utils";

/** Home packages showcase (legacy DestinationsSection slot) */
export async function DestinationsSection() {
  const { packages } = await listPublishedPackages({ page: 1, limit: 6 });

  return (
    <section className="section-pad relative overflow-hidden bg-bg-secondary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(225,29,46,0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(37,99,235,0.12), transparent 50%)",
        }}
      />

      <div className="container-site relative">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="Packages"
            title="Popular Tour Packages"
            description="Weekend getaways, city breaks and transfer packages — TrueWay Taxi ready."
          />
          <Link
            href="/tour-packages"
            className="text-sm font-semibold text-orange hover:underline"
          >
            View all packages →
          </Link>
        </div>

        {packages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-secondary">
            Packages will appear here once published from the CRM.
          </p>
        ) : (
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {packages.map((pkg, i) => (
              <Reveal key={pkg.slug} delay={i * 0.05} className="h-full">
                <article className="group grid h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0c1018] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition duration-300 hover:border-orange/35 hover:shadow-[0_24px_60px_rgba(225,29,46,0.12)] sm:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]">
                  <Link
                    href={`/tour-packages/${pkg.slug}`}
                    className="relative isolate block h-[200px] w-full overflow-hidden sm:h-auto sm:min-h-[260px]"
                  >
                    {pkg.image ? (
                      <MediaImage
                        src={pkg.image}
                        alt={pkg.title}
                        fill
                        sizes="(max-width:640px) 100vw, 260px"
                        className="object-cover object-center transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-text-secondary/40">
                        <Gift className="h-10 w-10" />
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:to-black/25" />
                    {pkg.duration ? (
                      <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                        <Clock className="h-3.5 w-3.5 text-orange" />
                        {pkg.duration}
                      </span>
                    ) : null}
                  </Link>

                  <div className="flex min-w-0 flex-col p-5 sm:p-6">
                    {pkg.destinations?.length ? (
                      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange">
                        <MapPin className="h-3.5 w-3.5" />
                        {pkg.destinations.slice(0, 2).join(" · ")}
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange">
                        Tour package
                      </p>
                    )}

                    <Link href={`/tour-packages/${pkg.slug}`} className="mt-2">
                      <h3 className="text-xl font-bold leading-snug text-white transition group-hover:text-orange sm:text-2xl">
                        {pkg.title}
                      </h3>
                    </Link>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
                      {pkg.summary}
                    </p>

                    <div className="mt-5 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-text-secondary">
                          Starting from
                        </p>
                        {pkg.samplePriceFrom > 0 ? (
                          <p className="mt-0.5 text-lg font-bold text-orange">
                            {formatINR(pkg.samplePriceFrom)}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-sm font-semibold text-white">On request</p>
                        )}
                      </div>
                    </div>

                    <CardCtaActions
                      learnMoreHref={`/tour-packages/${pkg.slug}`}
                      learnMoreLabel="Learn more"
                      contextLabel={`Package: ${pkg.title}`}
                      fullWidth
                      className="mt-4"
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
