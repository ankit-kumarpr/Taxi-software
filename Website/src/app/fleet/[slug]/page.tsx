import type { Metadata } from "next";
import Image from "next/image";
import { BriefcaseBusiness, CheckCircle2, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { PageHero } from "@/components/common/PageHero";
import { fleet, getVehicleBySlug } from "@/data/fleet";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return fleet.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return {};
  return createMetadata({ title: `${vehicle.name} Taxi`, description: vehicle.summary, path: `/fleet/${slug}`, image: vehicle.image });
}

export default async function FleetDetailPage({ params }: Props) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) notFound();
  const jsonLd = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Fleet", path: "/fleet" }, { name: vehicle.name, path: `/fleet/${slug}` }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero title={vehicle.name} description={vehicle.summary} crumbs={[{ label: "Home", href: "/" }, { label: "Fleet", href: "/fleet" }, { label: vehicle.name }]} />
      <main className="section-pad bg-bg-main">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_380px]">
          <article>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border"><Image src={vehicle.image} alt={vehicle.name} fill priority sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover" /></div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-text-secondary">
              <span className="rounded-full bg-bg-card px-4 py-2 text-orange">{vehicle.category}</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-bg-card px-4 py-2"><Users className="h-4 w-4 text-orange" />{vehicle.seats} seats</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-bg-card px-4 py-2"><BriefcaseBusiness className="h-4 w-4 text-orange" />{vehicle.luggage}</span>
            </div>
            <p className="mt-6 leading-7 text-text-secondary">{vehicle.description}</p>
            <p className="mt-4 rounded-xl border border-orange/30 bg-orange/10 p-4 text-sm text-text-secondary"><strong className="text-orange">Fare information:</strong> {vehicle.sampleFareNote}.</p>
            <h2 className="mt-10 text-2xl font-bold">Vehicle features</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">{vehicle.features.map((feature) => <li key={feature} className="flex items-center gap-3 rounded-xl border border-border bg-bg-card p-4 text-text-secondary"><CheckCircle2 className="h-5 w-5 text-orange" />{feature}</li>)}</ul>
          </article>
          <aside aria-label="Request a vehicle quote"><BookingForm compact /></aside>
        </div>
      </main>
    </>
  );
}
