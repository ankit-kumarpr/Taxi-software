import type { InfoPage } from "@/types";

export const infoPages: InfoPage[] = [
  {
    slug: "travel-tips",
    title: "India Taxi Travel Tips",
    summary: "Practical pointers for safer and smoother taxi journeys across India.",
    sections: [
      {
        heading: "Allow time for local conditions",
        body: "Traffic, weather and road conditions vary by city and route, so keep a sensible buffer in your plan.",
      },
      {
        heading: "Pack for the route",
        body: "Check the weather at your pickup, stops and destination, then carry suitable clothing and essentials.",
      },
      {
        heading: "Confirm meeting points",
        body: "Share a clear landmark for hotel, station or airport pickup before the driver starts.",
      },
    ],
  },
  {
    slug: "packing-checklist",
    title: "Packing Checklist for Cab Trips",
    summary: "A simple list for local, airport and outstation taxi travel.",
    sections: [
      {
        heading: "Documents",
        body: "ID proofs, hotel vouchers and any temple/park entry references you may need.",
      },
      {
        heading: "Essentials",
        body: "Water, medicines, chargers, and weather-appropriate clothing.",
      },
      {
        heading: "Luggage tips",
        body: "Mention bag count in your quote request so the right vehicle category can be suggested.",
      },
    ],
  },
  {
    slug: "safety-guidelines",
    title: "Safety Guidelines",
    summary: "General safety practices for passengers travelling by taxi.",
    sections: [
      {
        heading: "Share your trip details",
        body: "Tell a family member your route and expected arrival window.",
      },
      {
        heading: "Use seat belts",
        body: "Buckle up on highways and hill roads alike.",
      },
      {
        heading: "Verify driver details",
        body: "Always match the shared driver and vehicle details before boarding.",
      },
    ],
  },
];

export function getInfoBySlug(slug: string) {
  return infoPages.find((i) => i.slug === slug);
}
