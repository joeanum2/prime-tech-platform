import type { MetadataRoute } from "next";
import { services } from "@/data/services";
import { articles } from "@/data/articles";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  const baseRoutes = [
    "",
    "/services",
    "/book",
    "/track",
    "/articles",
    "/contact",
    "/legal/privacy",
    "/legal/terms"
  ];

  const serviceRoutes = services.map((service) => `/services/${service.slug}`);
  const articleRoutes = articles.map((article) => `/articles/${article.slug}`);

  return [...baseRoutes, ...serviceRoutes, ...articleRoutes].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date()
  }));
}
