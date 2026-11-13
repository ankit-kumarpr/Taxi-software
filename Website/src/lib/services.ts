import { apiGet, mediaUrl } from "@/lib/api";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";
import type { ServiceItem } from "@/types";

type ApiImage = { url?: string } | null;
type ApiFaq = { question?: string; answer?: string };

type ApiService = {
  _id?: string;
  slug: string;
  shortHeading?: string;
  mainHeading?: string;
  shortDescription?: string;
  mainContent?: string;
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
  data?: ApiService[];
  pagination?: { total?: number; page?: number; pages?: number; limit?: number };
};

type DetailResponse = {
  success?: boolean;
  data?: ApiService;
};

export function mapApiService(service: ApiService): ServiceItem {
  const title = service.mainHeading || service.metaTitle || "Untitled";
  return {
    id: service._id,
    slug: service.slug,
    title,
    shortTitle: service.shortHeading || title,
    summary: service.shortDescription || service.metaDescription || "",
    description: sanitizeBlogHtml(service.mainContent || ""),
    shortHeading: service.shortHeading || "",
    shortDescription: service.shortDescription || "",
    contentHtml: sanitizeBlogHtml(service.mainContent || ""),
    features: service.includes || [],
    includes: service.includes || [],
    excludes: service.excludes || [],
    faqs: (service.faqs || [])
      .map((f) => ({
        question: String(f.question || "").trim(),
        answer: String(f.answer || "").trim(),
      }))
      .filter((f) => f.question || f.answer),
    image: mediaUrl(service.mainImage?.url) || "",
    otherImages: (service.otherImages || [])
      .map((img) => mediaUrl(img?.url))
      .filter(Boolean),
    metaTitle: service.metaTitle || title,
    metaDescription: service.metaDescription || service.shortDescription || "",
    metaKeywords: service.metaKeywords || "",
    canonical: service.canonical || "",
    schema: service.schema,
    schemaJson: service.schemaJson,
    icon: "car",
    updatedAt: service.updatedAt,
    createdAt: service.createdAt,
  };
}

export async function listPublishedServices(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  const res = await apiGet<ListResponse>(`/services/list${qs ? `?${qs}` : ""}`);
  const rows = res?.data || [];
  return {
    services: rows.map(mapApiService),
    pagination: res?.pagination,
  };
}

export async function getServiceBySlug(slug: string): Promise<ServiceItem | null> {
  if (!slug) return null;
  const res = await apiGet<DetailResponse>(`/services/slug/${encodeURIComponent(slug)}`);
  if (!res?.data) return null;
  return mapApiService(res.data);
}

export async function getAllServiceSlugs(): Promise<string[]> {
  const { services } = await listPublishedServices({ page: 1, limit: 100 });
  return services.map((s) => s.slug).filter(Boolean);
}
