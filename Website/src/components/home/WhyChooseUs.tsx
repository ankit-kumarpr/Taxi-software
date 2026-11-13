import { Headphones, MapPinned, Shield, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const points = [
  {
    icon: Shield,
    title: "Safety First",
    text: "Professional drivers and well-maintained vehicles for city, hill and highway travel.",
  },
  {
    icon: MapPinned,
    title: "Local Route Knowledge",
    text: "Route-aware travel support across metros, tourist cities and intercity corridors.",
  },
  {
    icon: Headphones,
    title: "Support Around the Clock",
    text: "Round-the-clock assistance for booking enquiries and journey coordination.",
  },
  {
    icon: Sparkles,
    title: "Transparent Quotes",
    text: "Clear fare details with vehicle, route and applicable charges confirmed before travel.",
  },
];

export function WhyChooseUs() {
  return (
    <section className="section-pad bg-bg-secondary">
      <div className="container-site">
        <SectionHeading
          eyebrow="Why Us"
          title="Why Choose TrueWay Taxi"
          description="Reliable service, clear communication and comfortable travel across India."
          align="center"
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {points.map((point, i) => (
            <Reveal key={point.title} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-border bg-bg-card p-5">
                <point.icon className="h-6 w-6 text-orange" />
                <h3 className="mt-4 text-lg font-bold text-white">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{point.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
