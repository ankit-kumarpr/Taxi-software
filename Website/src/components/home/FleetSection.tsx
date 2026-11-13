import Link from "next/link";
import { Car, Users } from "lucide-react";
import { MediaImage } from "@/components/common/MediaImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { listPublishedVehicles } from "@/lib/vehicles";

export async function FleetSection() {
  const { vehicles } = await listPublishedVehicles({ page: 1, limit: 8 });

  return (
    <section className="section-pad bg-bg-main">
      <div className="container-site">
        <SectionHeading
          eyebrow="Our Fleet"
          title="Available Vehicles"
          description="Choose a category that fits passengers, luggage and road type. Models vary by availability."
        />

        {vehicles.length === 0 ? (
          <p className="mt-10 text-center text-sm text-text-secondary">
            Vehicles will appear here once added from the admin panel.
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {vehicles.map((vehicle, i) => (
              <Reveal key={vehicle.id} delay={i * 0.05}>
                <Link
                  href="/contact"
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition hover:border-orange/40"
                >
                  <div className="relative aspect-[16/10] bg-black/30">
                    {vehicle.image ? (
                      <MediaImage
                        src={vehicle.image}
                        alt={vehicle.name}
                        fill
                        sizes="(max-width:768px) 100vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-text-secondary/40">
                        <Car className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-lg font-bold text-white group-hover:text-orange">{vehicle.name}</h3>
                    <p className="mt-1 text-xs text-text-secondary">{vehicle.category}</p>
                    <p className="mt-3 flex items-center gap-1.5 text-sm text-text-secondary">
                      <Users className="h-4 w-4 text-orange" />
                      {vehicle.seats ? `${vehicle.seats} seats` : "Seats on request"}
                    </p>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm text-text-secondary">{vehicle.summary}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/fleet" className="btn-outline-orange">
            View Full Fleet
          </Link>
        </div>
      </div>
    </section>
  );
}
