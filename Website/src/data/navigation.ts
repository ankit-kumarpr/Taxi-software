import type { NavItem } from "@/types";

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Services",
    href: "/services",
    children: [],
  },
  {
    label: "Packages",
    href: "/tour-packages",
    children: [],
  },
  { label: "About Us", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const footerLinks = {
  services: [
    { label: "All Services", href: "/services" },
    { label: "Tour Packages", href: "/tour-packages" },
    { label: "Fleet", href: "/fleet" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Fleet", href: "/fleet" },
    { label: "FAQ", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms & Conditions", href: "/terms" },
  ],
};
