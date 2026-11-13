import { PageHero } from "@/components/common/PageHero";
import { faqs } from "@/data/faq";
import { breadcrumbJsonLd, createMetadata, faqJsonLd } from "@/lib/seo";

export const metadata = createMetadata({
  title: "Taxi Booking Frequently Asked Questions",
  description:
    "Answers about TrueWay Taxi bookings, fares, vehicles, airport pickups and pan-India travel.",
  path: "/faq",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <PageHero
        title="Frequently Asked Questions"
        description="Helpful details about booking and planning your taxi journey."
        crumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site max-w-4xl space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl border border-border bg-bg-card p-5 open:border-orange/50"
            >
              <summary className="cursor-pointer list-none pr-6 font-semibold text-white marker:hidden">
                <span className="text-orange">{faq.category ? `${faq.category} · ` : ""}</span>
                {faq.question}
              </summary>
              <p className="mt-4 border-t border-border pt-4 leading-7 text-text-secondary">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
