import { PageHero } from "@/components/common/PageHero";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "About Our Taxi Service",
  description:
    "Learn about TrueWay Taxi and our approach to safe, reliable cab travel across India.",
  path: "/about",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
];

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title={`About ${siteConfig.name}`}
        description="Reliable local, airport, outstation and tour cab service across India."
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6 text-text-secondary">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-orange">Our purpose</p>
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                Making taxi planning across India easier
              </h2>
            </div>
            <p>
              TrueWay Taxi helps travellers arrange cabs for local rides,
              airport transfers, outstation journeys, hill stations and pilgrimage routes.
            </p>
            <p>
              Our service approach centres on clear communication, suitable vehicle selection and
              route-aware planning. We confirm availability, fares and journey details before travel.
            </p>
            <div className="rounded-2xl border border-orange/30 bg-orange/10 p-5">
              <h3 className="font-semibold text-white">Travel with confidence</h3>
              <p className="mt-2 text-sm">
                From your first enquiry to the final drop, our team focuses on dependable coordination,
                comfortable vehicles and courteous service for every journey.
              </p>
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-bg-card p-6">
            <h2 className="text-xl font-bold text-white">Company details</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="text-text-secondary">Business name</dt>
                <dd className="mt-1 font-medium text-white">{siteConfig.name}</dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-text-secondary">Business details</dt>
                <dd className="mt-1 font-medium text-white">Contact us for business details</dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-text-secondary">Coverage</dt>
                <dd className="mt-1 font-medium text-white">{siteConfig.address}</dd>
              </div>
              <div className="border-t border-border pt-4">
                <dt className="text-text-secondary">Service area</dt>
                <dd className="mt-1 font-medium text-white">{siteConfig.serviceArea}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </>
  );
}
