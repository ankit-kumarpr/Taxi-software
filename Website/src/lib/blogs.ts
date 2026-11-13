import { apiGet, mediaUrl } from "@/lib/api";
import { sanitizeBlogHtml } from "@/lib/sanitizeBlogHtml";
import type { BlogPost } from "@/types";

type ApiImage = {
  url?: string;
  originalName?: string;
} | null;

type ApiFaq = {
  question?: string;
  answer?: string;
};

type ApiBlog = {
  _id?: string;
  slug: string;
  shortHeading?: string;
  mainHeading?: string;
  shortContent?: string;
  mainContent?: string;
  mainImage?: ApiImage;
  otherImages?: ApiImage[];
  faqs?: ApiFaq[];
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
  schema?: Record<string, unknown>;
  schemaJson?: string;
};

type ListResponse = {
  success?: boolean;
  data?: ApiBlog[];
  pagination?: { total?: number; page?: number; pages?: number; limit?: number };
};

type DetailResponse = {
  success?: boolean;
  data?: ApiBlog;
};

function estimateReadTime(htmlOrText: string) {
  const text = String(htmlOrText || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min`;
}

function formatDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function mapApiBlog(blog: ApiBlog): BlogPost {
  const title = blog.mainHeading || blog.metaTitle || "Untitled";
  const contentHtml = sanitizeBlogHtml(blog.mainContent || "");
  return {
    id: blog._id,
    slug: blog.slug,
    title,
    shortHeading: blog.shortHeading || "",
    excerpt: blog.shortContent || blog.metaDescription || "",
    contentHtml,
    content: [],
    category: blog.shortHeading || "Blog",
    date: formatDate(blog.createdAt) || formatDate(blog.updatedAt),
    updatedAt: formatDate(blog.updatedAt),
    readTime: estimateReadTime(contentHtml || blog.shortContent || ""),
    image: mediaUrl(blog.mainImage?.url) || "",
    otherImages: (blog.otherImages || [])
      .map((img) => mediaUrl(img?.url))
      .filter(Boolean),
    faqs: (blog.faqs || [])
      .map((f) => ({
        question: String(f.question || "").trim(),
        answer: String(f.answer || "").trim(),
      }))
      .filter((f) => f.question || f.answer),
    metaTitle: blog.metaTitle || title,
    metaDescription: blog.metaDescription || blog.shortContent || "",
    metaKeywords: blog.metaKeywords || "",
    schema: blog.schema,
    schemaJson: blog.schemaJson,
  };
}

export async function listPublishedBlogs(params?: { page?: number; limit?: number; search?: string }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.search) q.set("search", params.search);
  const qs = q.toString();
  const res = await apiGet<ListResponse>(`/blogs/list${qs ? `?${qs}` : ""}`);
  const rows = res?.data || [];
  return {
    posts: rows.map(mapApiBlog),
    pagination: res?.pagination,
  };
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!slug) return null;
  const res = await apiGet<DetailResponse>(`/blogs/slug/${encodeURIComponent(slug)}`);
  if (!res?.data) return null;
  return mapApiBlog(res.data);
}

export async function getAllBlogSlugs(): Promise<string[]> {
  const { posts } = await listPublishedBlogs({ page: 1, limit: 100 });
  return posts.map((p) => p.slug).filter(Boolean);
}
