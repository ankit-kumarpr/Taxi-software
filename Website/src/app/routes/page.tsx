import Link from "next/link";
import { ArrowRight, Clock, IndianRupee, Route as RouteIcon } from "lucide-react";
import { PageHero } from "@/components/common/PageHero";
import { routes } from "@/data/routes";
import { createMetadata } from "@/lib/seo";
import { formatINR } from "@/lib/utils";

export const metadata = createMetadata({
  title: "Popular Taxi Routes & Fares",
  description: "Browse distances, journey times and starting taxi fares for popular routes across India.",
  path: "/routes",
});

export default function RoutesPage() {
  return (
    <>
      <PageHero title="Taxi Routes & Fares" description="Compare popular city, airport and outstation connections across India." crumbs={[{ label: "Home", href: "/" }, { label: "Routes" }]} />
      <main className="section-pad bg-bg-main">
        <div className="container-site">
          <div className="grid gap-5 md:grid-cols-2">
            {routes.map((route) => (
              <article key={route.slug} className="rounded-2xl border border-border bg-bg-card p-5">
                <h2 className="text-xl font-bold">{route.from} <span className="text-orange">→</span> {route.to}</h2>
                <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="flex items-center gap-1 text-text-secondary"><RouteIcon className="h-4 w-4 text-orange" />Distance</dt><dd className="mt-1 font-semibold">{route.distanceKm} km</dd></div>
                  <div><dt className="flex items-center gap-1 text-text-secondary"><Clock className="h-4 w-4 text-orange" />Duration</dt><dd className="mt-1 font-semibold">{route.duration}</dd></div>
                  <div><dt className="flex items-center gap-1 text-text-secondary"><IndianRupee className="h-4 w-4 text-orange" />From</dt><dd className="mt-1 font-semibold text-orange">{formatINR(route.startingPrice)}</dd></div>
                </dl>
                <Link href={`/routes/${route.slug}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-orange hover:text-orange-secondary">Route details <ArrowRight className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
