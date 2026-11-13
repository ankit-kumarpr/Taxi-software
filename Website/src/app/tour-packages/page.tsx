import Link from "next/link";
import { Clock, Gift, MapPin } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { CardCtaActions } from "@/components/common/CardCtaActions";
import { PageHero } from "@/components/common/PageHero";
import { listPublishedPackages } from "@/lib/packages";
import { createMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/utils";

export const revalidate = 60;

export const metadata = createMetadata({
  title: "India Taxi Tour Packages",
  description:
    "Browse TrueWay Taxi packages for popular city breaks, road trips and airport transfers across India.",
  path: "/tour-packages",
});

export default async function TourPackagesPage() {
  const { packages } = await listPublishedPackages({ page: 1, limit: 48 });

  return (
    <>
      <PageHero
        title="Tour Packages"
        description="Flexible road-trip plans for city breaks, airport transfers and weekend getaways across India."
        crumbs={[{ label: "Home", href: "/" }, { label: "Tour Packages" }]}
      />
      <main className="section-pad bg-bg-main">
        <div className="container-site">
          {packages.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-bg-card px-6 py-20 text-center">
              <Gift className="mb-3 h-10 w-10 text-text-secondary/50" aria-hidden />
              <p className="text-lg font-semibold text-white">No packages published yet</p>
              <p className="mt-2 max-w-md text-sm text-text-secondary">
                Published packages from the CRM will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {packages.map((pkg) => (
                <article
                  key={pkg.slug}
                  className="group grid h-full overflow-hidden rounded-3xl border border-white/10 bg-[#0c1018] shadow-[0_20px_50px_rgba(0,0,0,0.35)] transition duration-300 hover:border-orange/35 hover:shadow-[0_24px_60px_rgba(225,29,46,0.12)] sm:grid-cols-[240px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)]"
                >
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
                        <Gift className="h-10 w-10" aria-hidden />
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
                      <h2 className="text-xl font-bold leading-snug text-white transition group-hover:text-orange sm:text-2xl">
                        {pkg.title}
                      </h2>
                    </Link>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
                      {pkg.summary}
                    </p>

                    <div className="mt-5 border-t border-white/10 pt-4">
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

                    <CardCtaActions
                      learnMoreHref={`/tour-packages/${pkg.slug}`}
                      learnMoreLabel="Learn more"
                      contextLabel={`Package: ${pkg.title}`}
                      fullWidth
                      className="mt-4"
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
