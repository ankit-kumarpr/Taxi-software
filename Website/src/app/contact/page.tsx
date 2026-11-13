import { Mail, MapPin, Phone } from "lucide-react";
import { BookingForm } from "@/components/booking/BookingForm";
import { PageHero } from "@/components/common/PageHero";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Contact & Request a Taxi Quote",
  description:
    "Contact TrueWay Taxi to request a quote for local, airport and outstation travel across India.",
  path: "/contact",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Contact", path: "/contact" },
];

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title="Contact & Booking Enquiry"
        description="Ask about a route, vehicle or travel date and plan your journey with our team."
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site grid gap-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-orange">Get in touch</p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">Plan your journey</h2>
            <p className="mt-4 max-w-xl text-text-secondary">
              Use the contact details below or share your trip requirements through the quote form.
              Our team will help confirm availability, vehicle options and pricing.
            </p>

            <div className="mt-8 space-y-4">
              <a
                href={`tel:${siteConfig.phoneTel}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-orange"
              >
                <Phone className="h-6 w-6 text-orange" aria-hidden />
                <span>
                  <span className="block text-sm text-text-secondary">Phone</span>
                  <span className="font-semibold text-white">{siteConfig.phoneDisplay}</span>
                </span>
              </a>
              <a
                href={`mailto:${siteConfig.email}`}
                className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-5 transition-colors hover:border-orange"
              >
                <Mail className="h-6 w-6 text-orange" aria-hidden />
                <span>
                  <span className="block text-sm text-text-secondary">Email</span>
                  <span className="font-semibold text-white">{siteConfig.email}</span>
                </span>
              </a>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-bg-card p-5">
                <MapPin className="h-6 w-6 text-orange" aria-hidden />
                <span>
                  <span className="block text-sm text-text-secondary">Address</span>
                  <span className="font-semibold text-white">{siteConfig.address}</span>
                </span>
              </div>
            </div>
          </div>

          <div>
            <BookingForm />
          </div>
        </div>
      </section>
    </>
  );
}
