import type { Metadata } from "next";
import { Clock, Route as RouteIcon, WalletCards } from "lucide-react";
import { notFound } from "next/navigation";
import { BookingForm } from "@/components/booking/BookingForm";
import { PageHero } from "@/components/common/PageHero";
import { getRouteBySlug, routes } from "@/data/routes";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return routes.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) return {};
  return createMetadata({ title: `${route.from} to ${route.to} Taxi`, description: route.description, path: `/routes/${slug}` });
}

export default async function RouteDetailPage({ params }: Props) {
  const { slug } = await params;
  const route = getRouteBySlug(slug);
  if (!route) notFound();
  const title = `${route.from} to ${route.to} Taxi`;
  const jsonLd = breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Routes", path: "/routes" }, { name: title, path: `/routes/${slug}` }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHero title={title} description={route.description} crumbs={[{ label: "Home", href: "/" }, { label: "Routes", href: "/routes" }, { label: `${route.from} to ${route.to}` }]} />
      <main className="section-pad bg-bg-main">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_380px]">
          <article>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-bg-card p-5"><dt className="flex items-center gap-2 text-sm text-text-secondary"><RouteIcon className="h-5 w-5 text-orange" />Distance</dt><dd className="mt-2 text-xl font-bold">{route.distanceKm} km</dd></div>
              <div className="rounded-xl border border-border bg-bg-card p-5"><dt className="flex items-center gap-2 text-sm text-text-secondary"><Clock className="h-5 w-5 text-orange" />Estimated time</dt><dd className="mt-2 text-xl font-bold">{route.duration}</dd></div>
              <div className="rounded-xl border border-border bg-bg-card p-5"><dt className="flex items-center gap-2 text-sm text-text-secondary"><WalletCards className="h-5 w-5 text-orange" />Fare from</dt><dd className="mt-2 text-xl font-bold text-orange">{formatINR(route.startingPrice)}</dd></div>
            </dl>
            <h2 className="mt-10 text-2xl font-bold">Fare information</h2>
            <p className="mt-4 leading-7 text-text-secondary">{route.sampleNote}. Driver allowance starts from {formatINR(route.driverAllowance)} where applicable. Request a quote to confirm all charges before travelling.</p>
          </article>
          <aside aria-label="Request a route quote"><BookingForm compact /></aside>
        </div>
      </main>
    </>
  );
}
