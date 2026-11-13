import { ClipboardList, MessageSquareQuote, CarFront } from "lucide-react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const steps = [
  {
    icon: ClipboardList,
    title: "Share Trip Details",
    text: "Select pickup, destination, date, time and vehicle category in the quote form.",
  },
  {
    icon: MessageSquareQuote,
    title: "Get a Quote",
    text: "Call or email our team to confirm the fare, vehicle and pickup details for your trip.",
  },
  {
    icon: CarFront,
    title: "Travel Comfortably",
    text: "Confirm your cab and enjoy a safe, comfortable journey with TrueWay Taxi.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-pad bg-bg-secondary">
      <div className="container-site">
        <SectionHeading
          eyebrow="Process"
          title="How It Works"
          description="Three simple steps from trip details to a comfortable ride."
          align="center"
        />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-border bg-bg-card p-6 text-center">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange px-3 py-0.5 text-xs font-bold text-white">
                  Step {i + 1}
                </span>
                <step.icon className="mx-auto mt-2 h-8 w-8 text-orange" />
                <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-text-secondary">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
