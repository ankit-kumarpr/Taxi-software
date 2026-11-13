import type { MetadataRoute } from "next";
import { fleet } from "@/data/fleet";
import { listPublishedBlogs } from "@/lib/blogs";
import { listPublishedPackages } from "@/lib/packages";
import { listPublishedServices } from "@/lib/services";
import { siteConfig } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const staticPaths = [
    "",
    "/about",
    "/services",
    "/fleet",
    "/tour-packages",
    "/contact",
    "/blog",
    "/faq",
    "/privacy-policy",
    "/terms",
  ];

  const [{ posts: blogPosts }, { services }, { packages }] = await Promise.all([
    listPublishedBlogs({ page: 1, limit: 100 }),
    listPublishedServices({ page: 1, limit: 100 }),
    listPublishedPackages({ page: 1, limit: 100 }),
  ]);

  return [
    ...staticPaths.map((path) => ({
      url: `${base}${path || "/"}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...services.map((s) => ({
      url: `${base}/services/${s.slug}`,
      lastModified: s.updatedAt || s.createdAt ? new Date(s.updatedAt || s.createdAt || Date.now()) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...fleet.map((v) => ({
      url: `${base}/fleet/${v.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...packages.map((p) => ({
      url: `${base}/tour-packages/${p.slug}`,
      lastModified: p.updatedAt || p.createdAt ? new Date(p.updatedAt || p.createdAt || Date.now()) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...blogPosts.map((b) => ({
      url: `${base}/blog/${b.slug}`,
      lastModified: b.updatedAt || b.date ? new Date(b.updatedAt || b.date) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
