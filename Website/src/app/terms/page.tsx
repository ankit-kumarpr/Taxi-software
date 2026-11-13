import { PageHero } from "@/components/common/PageHero";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Terms & Conditions",
  description:
    "Terms and conditions for TrueWay Taxi enquiries, bookings and cab services.",
  path: "/terms",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Terms & Conditions", path: "/terms" },
];

const sections = [
  {
    heading: "Quotes and booking confirmation",
    body: "Website prices are starting points. A booking is confirmed only after TrueWay Taxi agrees to the route, fare, vehicle, pickup time and payment terms with you.",
  },
  {
    heading: "Prices and availability",
    body: "Final fares may vary by exact pickup and drop points, vehicle category, travel date, tolls, parking, permits, waiting time, night allowance and requested stops. Vehicle models are subject to availability.",
  },
  {
    heading: "Travel information",
    body: "Distances and journey times are estimates. Traffic, weather, closures, permits and local restrictions can affect the route and arrival time.",
  },
  {
    heading: "Bookings, payments and cancellations",
    body: "Payment schedules and cancellation charges are shared when your booking is confirmed. Charges may apply when a booking is cancelled after a vehicle has been assigned or close to pickup time.",
  },
  {
    heading: "Passenger responsibilities",
    body: "Passengers should provide accurate journey details, follow applicable laws, use seat belts, carry required documents and confirm that the selected vehicle is suitable for passengers and luggage.",
  },
  {
    heading: "Liability and external links",
    body: "TrueWay Taxi is not responsible for delays caused by traffic, weather, road closures, government action or other circumstances outside reasonable control. External services and links are governed by their own terms.",
  },
  {
    heading: "Changes to these terms",
    body: "We may update these terms as services and operating requirements change. The latest version will remain available on this page. Contact us for business details or questions about these terms.",
  },
];

export default function TermsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title="Terms & Conditions"
        description="Important conditions for quotes, bookings and travel with TrueWay Taxi."
        crumbs={[{ label: "Home", href: "/" }, { label: "Terms & Conditions" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site max-w-4xl">
          <div className="space-y-5">
            {sections.map((section, index) => (
              <section key={section.heading} className="rounded-xl border border-border bg-bg-card p-6">
                <p className="text-sm font-semibold text-orange">Section {index + 1}</p>
                <h2 className="mt-2 text-xl font-bold text-white">{section.heading}</h2>
                <p className="mt-3 leading-7 text-text-secondary">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
