import Link from "next/link";
import { Phone } from "lucide-react";
import { siteConfig } from "@/lib/site";

export function ContactCta() {
  return (
    <section className="section-pad bg-bg-main">
      <div className="container-site">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#161b22] via-[#111827] to-black px-6 py-12 text-center md:px-12">
          <div className="pointer-events-none absolute -left-10 top-0 h-40 w-40 rounded-full bg-blue/25 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-orange/20 blur-3xl" />
          <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to Book TrueWay Taxi?</h2>
          <p className="mx-auto mt-3 max-w-xl text-text-secondary">
            Share your journey details and our team will help you choose the right cab for travel anywhere in India.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact" className="btn-orange min-w-[180px]">
              Contact / Booking
            </Link>
            <a href={`tel:${siteConfig.phoneTel}`} className="btn-outline-orange min-w-[180px]">
              <Phone className="h-4 w-4 text-orange" />
              {siteConfig.phoneDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
