import Link from "next/link";
import { Car, Users } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { PageHero } from "@/components/common/PageHero";
import { listPublishedVehicles } from "@/lib/vehicles";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Taxi Fleet Across India",
  description: "Explore our active taxi fleet — sedans, SUVs and more.",
  path: "/fleet",
});

export default async function FleetPage() {
  const { vehicles } = await listPublishedVehicles({ page: 1, limit: 48 });

  return (
    <>
      <PageHero
        title="Our Taxi Fleet"
        description="Choose a vehicle that fits your group size, luggage and route."
        crumbs={[{ label: "Home", href: "/" }, { label: "Fleet" }]}
      />
      <main className="section-pad bg-bg-main">
        <div className="container-site">
          {vehicles.length === 0 ? (
            <p className="text-center text-sm text-text-secondary">
              Vehicles will appear here once added from the admin panel.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {vehicles.map((vehicle) => (
                <article
                  key={vehicle.id}
                  className="group overflow-hidden rounded-2xl border border-border bg-bg-card"
                >
                  <Link href="/contact" className="flex h-full flex-col">
                    <div className="relative aspect-[16/10] bg-black/30">
                      {vehicle.image ? (
                        <MediaImage
                          src={vehicle.image}
                          alt={vehicle.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 25vw"
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-text-secondary/40">
                          <Car className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-orange">
                        {vehicle.category}
                      </p>
                      <h2 className="mt-2 text-xl font-bold">{vehicle.name}</h2>
                      <p className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                        <Users className="h-4 w-4 text-orange" />
                        {vehicle.seats ? `${vehicle.seats} seats` : "Seats on request"}
                      </p>
                      <p className="mt-4 flex-1 text-sm leading-6 text-text-secondary">
                        {vehicle.summary}
                      </p>
                      <p className="mt-4 text-xs font-semibold text-orange">
                        Request pricing and availability
                      </p>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
