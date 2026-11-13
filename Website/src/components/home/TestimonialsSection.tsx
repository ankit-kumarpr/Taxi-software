import { Quote } from "lucide-react";
import { testimonials } from "@/data/testimonials";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function TestimonialsSection() {
  return (
    <section className="section-pad bg-bg-main">
      <div className="container-site">
        <SectionHeading
          eyebrow="Testimonials"
          title="Customer Testimonials"
          description="What travellers say about their journeys with TrueWay Taxi."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <Reveal key={item.id} delay={i * 0.05}>
              <figure className="h-full rounded-2xl border border-dashed border-orange/30 bg-bg-card p-5">
                <Quote className="h-5 w-5 text-orange" />
                <blockquote className="mt-3 text-sm leading-relaxed text-text-secondary">
                  “{item.quote}”
                </blockquote>
                <figcaption className="mt-4 border-t border-border pt-3">
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-text-secondary">{item.trip}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
