import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/common/BrandLogo";
import { footerLinks } from "@/data/navigation";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary">
      <div className="container-site grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandLogo imageClassName="h-12 sm:h-14" />
          <p className="mt-4 text-sm leading-relaxed text-text-secondary">{siteConfig.tagline}</p>
          <p className="mt-3 text-xs text-text-secondary/80">
            Local, airport, outstation and tour cab service across major cities in India.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue">Services</h3>
          <ul className="mt-4 space-y-2">
            {footerLinks.services.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-secondary hover:text-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue">Company</h3>
          <ul className="mt-4 space-y-2">
            {footerLinks.company.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-text-secondary hover:text-orange">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-orange" />
              <a href={`tel:${siteConfig.phoneTel}`} className="hover:text-blue">
                {siteConfig.phoneDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-orange" />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-blue">
                {siteConfig.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-orange" />
              <span>{siteConfig.address}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border bg-black">
        <div className="container-site flex flex-col gap-3 py-5 text-xs text-text-secondary md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4">
            {footerLinks.legal.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-orange">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
