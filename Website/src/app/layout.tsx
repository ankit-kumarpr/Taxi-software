import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingActions } from "@/components/common/FloatingActions";
import { Preloader } from "@/components/common/Preloader";
import { listPublishedPackages } from "@/lib/packages";
import { listPublishedServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";
import { localBusinessJsonLd } from "@/lib/seo";
import "./globals.css";

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Cab Booking Across India`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "TrueWay Taxi",
    "cab booking India",
    "outstation taxi",
    "airport cab",
    "India taxi service",
    "one way cab",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ services }, { packages }] = await Promise.all([
    listPublishedServices({ page: 1, limit: 50 }),
    listPublishedPackages({ page: 1, limit: 50 }),
  ]);
  const serviceLinks = services.map((service) => ({
    label: service.shortTitle || service.title,
    href: `/services/${service.slug}`,
  }));
  const packageLinks = packages.map((pkg) => ({
    label: pkg.shortTitle || pkg.title,
    href: `/tour-packages/${pkg.slug}`,
    description: pkg.duration || undefined,
  }));

  return (
    <html lang="en" className={`${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg-main font-sans text-text-main">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
        />
        <Preloader />
        <Header serviceLinks={serviceLinks} packageLinks={packageLinks} />
        <main className="flex-1">{children}</main>
        <Footer />
        <FloatingActions />
      </body>
    </html>
  );
}
