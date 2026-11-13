import Link from "next/link";
import { faqs } from "@/data/faq";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function FaqPreview() {
  const items = faqs.slice(0, 5);

  return (
    <section className="section-pad bg-bg-secondary">
      <div className="container-site">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently Asked Questions"
            description="Quick answers about bookings, fares, vehicles and travel planning."
          />
          <Link href="/faq" className="text-sm font-semibold text-orange hover:underline">
            View all FAQs →
          </Link>
        </div>
        <div className="mt-8 space-y-3">
          {items.map((faq) => (
            <details
              key={faq.id}
              className="group rounded-xl border border-border bg-bg-card px-4 py-3 open:border-orange/40"
            >
              <summary className="cursor-pointer list-none font-semibold text-white marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {faq.question}
                  <span className="text-orange transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
