import type { Vehicle } from "@/types";

export const fleet: Vehicle[] = [
  {
    slug: "sedan",
    name: "Sedan",
    category: "Economy / Comfort",
    seats: 4,
    luggage: "2 medium bags",
    summary: "Ideal for couples and small families on city or short outstation trips.",
    description:
      "Sedan-class vehicles offer comfortable, economical travel for city rides, airport transfers and short outstation trips.",
    features: ["AC", "Music system", "Comfortable seating", "City & highway ready"],
    sampleFareNote: "Request a quote based on your route, date and pickup location",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1200&q=80",
  },
  {
    slug: "suv",
    name: "SUV",
    category: "Family / Hills",
    seats: 6,
    luggage: "4 medium bags",
    summary: "Spacious option for hill roads, families and luggage-heavy trips.",
    description:
      "SUV category commonly preferred for longer journeys, hill routes and luggage-heavy trips across India. Models may include Innova-class options depending on availability.",
    features: ["Higher ground clearance", "Extra luggage space", "Family seating", "Hill-friendly"],
    sampleFareNote: "Request a quote based on your route, date and pickup location",
    image: "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=1200&q=80",
  },
  {
    slug: "innova-crysta",
    name: "Innova Crysta",
    category: "Premium MPV",
    seats: 7,
    luggage: "4–5 bags",
    summary: "Popular premium choice for outstation and group comfort.",
    description:
      "Innova Crysta-class vehicles provide generous cabin space for families and groups on longer journeys.",
    features: ["Captain / bench options", "Strong AC", "Outstation favourite", "Group friendly"],
    sampleFareNote: "Request a quote to confirm vehicle availability and pricing",
    image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=1200&q=80",
  },
  {
    slug: "tempo-traveller",
    name: "Tempo Traveller",
    category: "Group",
    seats: 12,
    luggage: "Group luggage",
    summary: "Best for larger groups, temple tours and package itineraries.",
    description:
      "Group transport category for packages and family gatherings. Seat count can vary by vehicle configuration.",
    features: ["Group seating", "Pushback options (varies)", "Tour packages", "Long-route capable"],
    sampleFareNote: "Request a quote based on group size, route and travel duration",
    image: "https://images.unsplash.com/photo-1544620341-1adc2ba02545?w=1200&q=80",
  },
];

export function getVehicleBySlug(slug: string) {
  return fleet.find((v) => v.slug === slug);
}

export const vehicleTypeOptions = fleet.map((v) => v.name);
