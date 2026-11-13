import Link from "next/link";
import { ArrowRight, Navigation } from "lucide-react";
import { popularRoutes } from "@/data/routes";
import { formatINR } from "@/lib/utils";

export function PopularRoutes() {
  return (
    <section className="section-pad bg-bg-secondary">
      <div className="container-site">
        <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              POPULAR ROUTES & PRICING
            </h2>
            <p className="mt-2 text-sm text-text-secondary">One Way · Clear starting fares · Pan-India service</p>
          </div>
          <Link href="/routes" className="inline-flex items-center gap-1 text-sm font-semibold text-blue hover:underline">
            View All Routes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-bg-card">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-4 border-b border-border bg-blue/10 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-blue md:grid">
            <span>Route</span>
            <span>Distance</span>
            <span>Price (Starting)</span>
            <span>Driver Allowance</span>
            <span className="sr-only">Book</span>
          </div>

          <ul className="divide-y divide-border">
            {popularRoutes.map((route) => (
              <li key={route.slug} className="px-4 py-4 md:px-5">
                <div className="grid items-center gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange/15 text-orange">
                      <Navigation className="h-4 w-4" />
                    </span>
                    <div>
                      <Link
                        href={`/routes/${route.slug}`}
                        className="font-semibold text-white hover:text-blue"
                      >
                        {route.from} to {route.to}
                      </Link>
                      <p className="text-[11px] text-text-secondary md:hidden">
                        {route.distanceKm} KM · {route.duration}
                      </p>
                    </div>
                  </div>
                  <p className="hidden text-sm text-text-secondary md:block">
                    {route.distanceKm} KM · {route.duration}
                  </p>
                  <p className="text-sm font-bold text-orange">
                    {formatINR(route.startingPrice)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {formatINR(route.driverAllowance)}
                  </p>
                  <Link
                    href={`/routes/${route.slug}`}
                    className="inline-flex items-center justify-center rounded-md bg-orange px-3 py-2 text-xs font-bold text-white hover:bg-orange-secondary"
                  >
                    Book Now
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex justify-center">
          <Link href="/routes" className="btn-outline-orange">
            View All Routes <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
