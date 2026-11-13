export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; description?: string }[];
};

export type ServiceItem = {
  id?: string;
  slug: string;
  title: string;
  shortTitle: string;
  summary: string;
  description: string;
  shortHeading?: string;
  shortDescription?: string;
  contentHtml?: string;
  features: string[];
  includes?: string[];
  excludes?: string[];
  faqs?: { question: string; answer: string }[];
  image?: string;
  otherImages?: string[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonical?: string;
  schema?: Record<string, unknown>;
  schemaJson?: string;
  icon?: "car" | "plane" | "map" | "mountain" | "users" | "clock";
  createdAt?: string;
  updatedAt?: string;
};

export type RouteItem = {
  slug: string;
  from: string;
  to: string;
  distanceKm: number;
  duration: string;
  startingPrice: number;
  driverAllowance: number;
  sampleNote: string;
  description: string;
  popular?: boolean;
};

export type Vehicle = {
  slug: string;
  name: string;
  category: string;
  seats: number;
  luggage: string;
  summary: string;
  description: string;
  features: string[];
  sampleFareNote: string;
  image: string;
};

export type TourPackage = {
  id?: string;
  slug: string;
  title: string;
  shortTitle?: string;
  duration: string;
  summary: string;
  description: string;
  contentHtml?: string;
  inclusions: string[];
  includes?: string[];
  excludes?: string[];
  destinations: string[];
  samplePriceFrom: number;
  priceFrom?: number | null;
  image: string;
  otherImages?: string[];
  faqs?: { question: string; answer: string }[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  canonical?: string;
  schema?: Record<string, unknown>;
  schemaJson?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Testimonial = {
  id: string;
  name: string;
  trip: string;
  quote: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  category?: string;
};

export type BlogPost = {
  id?: string;
  slug: string;
  title: string;
  shortHeading?: string;
  excerpt: string;
  /** Legacy paragraph array — unused for CMS HTML blogs */
  content: string[];
  contentHtml?: string;
  category: string;
  date: string;
  updatedAt?: string;
  readTime: string;
  image: string;
  otherImages?: string[];
  faqs?: { question: string; answer: string }[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  schema?: Record<string, unknown>;
  schemaJson?: string;
};

export type InfoPage = {
  slug: string;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
};
