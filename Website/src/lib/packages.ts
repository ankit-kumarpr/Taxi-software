import { apiGet, mediaUrl } from "@/lib/api";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";
import type { TourPackage } from "@/types";

type ApiImage = { url?: string } | null;
type ApiFaq = { question?: string; answer?: string };

type ApiPackage = {
  _id?: string;
  slug: string;
  shortHeading?: string;
  mainHeading?: string;
  shortDescription?: string;
  mainContent?: string;
  duration?: string;
  destinations?: string[];
  priceFrom?: number | null;
  mainImage?: ApiImage;
  otherImages?: ApiImage[];
  faqs?: ApiFaq[];
  includes?: string[];
  excludes?: string[];
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  canonical?: string;
  createdAt?: string;
  updatedAt?: string;
  schema?: Record<string, unknown>;
  schemaJson?: string;
};

type ListResponse = {
  success?: boolean;
  data?: ApiPackage[];
  pagination?: { total?: number; page?: number; pages?: number; limit?: number };
};

type DetailResponse = {
  success?: boolean;
  data?: ApiPackage;
};

export function mapApiPackage(pkg: ApiPackage): TourPackage {
  const title = pkg.mainHeading || pkg.metaTitle || "Untitled";
  return {
    id: pkg._id,
    slug: pkg.slug,
    title,
    shortTitle: pkg.shortHeading || title,
    summary: pkg.shortDescription || pkg.metaDescription || "",
    description: sanitizeBlogHtml(pkg.mainContent || ""),
    contentHtml: sanitizeBlogHtml(pkg.mainContent || ""),
    duration: pkg.duration || "",
    destinations: pkg.destinations || [],
    samplePriceFrom: pkg.priceFrom != null ? Number(pkg.priceFrom) : 0,
    priceFrom: pkg.priceFrom != null ? Number(pkg.priceFrom) : null,
    inclusions: pkg.includes || [],
    includes: pkg.includes || [],
    excludes: pkg.excludes || [],
    faqs: (pkg.faqs || [])
      .map((f) => ({
        question: String(f.question || "").trim(),
        answer: String(f.answer || "").trim(),
      }))
      .filter((f) => f.question || f.answer),
    image: mediaUrl(pkg.mainImage?.url) || "",
    otherImages: (pkg.otherImages || [])
      .map((img) => mediaUrl(img?.url))
      .filter(Boolean),
    metaTitle: pkg.metaTitle || title,
    metaDescription: pkg.metaDescription || pkg.shortDescription || "",
    metaKeywords: pkg.metaKeywords || "",
    canonical: pkg.canonical || "",
    schema: pkg.schema,
    schemaJson: pkg.schemaJson,
    updatedAt: pkg.updatedAt,
    createdAt: pkg.createdAt,
  };
}

export async function listPublishedPackages(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  const res = await apiGet<ListResponse>(`/packages/list${qs ? `?${qs}` : ""}`);
  const rows = res?.data || [];
  return {
    packages: rows.map(mapApiPackage),
    pagination: res?.pagination,
  };
}

export async function getPackageBySlug(slug: string): Promise<TourPackage | null> {
  if (!slug) return null;
  const res = await apiGet<DetailResponse>(`/packages/slug/${encodeURIComponent(slug)}`);
  if (!res?.data) return null;
  return mapApiPackage(res.data);
}

export async function getAllPackageSlugs(): Promise<string[]> {
  const { packages } = await listPublishedPackages({ page: 1, limit: 100 });
  return packages.map((p) => p.slug).filter(Boolean);
}
