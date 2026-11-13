import { PageHero } from "@/components/common/PageHero";
import { breadcrumbJsonLd, createMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export const metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "Learn how TrueWay Taxi handles personal information shared for cab enquiries and bookings.",
  path: "/privacy-policy",
});

const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Privacy Policy", path: "/privacy-policy" },
];

const sections = [
  {
    heading: "Information we collect",
    body: "When you contact us, we may receive your name, phone number, email address, pickup and destination details, travel dates and other information needed to prepare a quote or coordinate a journey.",
  },
  {
    heading: "How we use information",
    body: "We use the information you provide to respond to enquiries, prepare quotes, arrange vehicles, coordinate pickups, provide customer support and communicate service updates.",
  },
  {
    heading: "Information sharing",
    body: "Journey details may be shared with drivers or service partners only as needed to fulfil your booking. We do not sell personal information.",
  },
  {
    heading: "Data security and retention",
    body: "We take reasonable steps to protect personal information and retain it only for as long as needed for service, record-keeping and legal requirements.",
  },
  {
    heading: "Your choices",
    body: "You may ask us to correct or delete personal information, subject to legal and operational retention requirements. Please avoid sending payment card details or sensitive identity documents through general enquiry channels.",
  },
  {
    heading: "Policy updates",
    body: "We may update this policy as our services or legal obligations change. The latest version will remain available on this page.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(breadcrumbs)) }}
      />
      <PageHero
        title="Privacy Policy"
        description="How TrueWay Taxi handles information shared for enquiries and travel services."
        crumbs={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]}
      />

      <section className="section-pad bg-bg-main">
        <div className="container-site max-w-4xl">
          <div className="space-y-5">
            {sections.map((section) => (
              <section key={section.heading} className="rounded-xl border border-border bg-bg-card p-6">
                <h2 className="text-xl font-bold text-white">{section.heading}</h2>
                <p className="mt-3 leading-7 text-text-secondary">{section.body}</p>
              </section>
            ))}
          </div>
          <p className="mt-8 text-sm text-text-secondary">
            Privacy contact:{" "}
            <a className="text-orange" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
