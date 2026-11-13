import { HeroSection } from "@/components/home/HeroSection";
import { ServicesSection } from "@/components/home/ServicesSection";
import { DestinationsSection } from "@/components/home/DestinationsSection";
import { FleetSection } from "@/components/home/FleetSection";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";
import { FaqPreview } from "@/components/home/FaqPreview";
import { ContactCta } from "@/components/home/ContactCta";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
  title: "TrueWay Taxi | Cab Booking Across India",
  description:
    "Book TrueWay Taxi for local, outstation and airport travel across India.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <DestinationsSection />
      <FleetSection />
      <WhyChooseUs />
      <HowItWorks />
      <TestimonialsSection />
      <FaqPreview />
      <ContactCta />
    </>
  );
}
