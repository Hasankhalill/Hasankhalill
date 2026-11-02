import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const staticPaths = ["", "/shop", "/categories", "/offers", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms"];
  return [
    ...staticPaths.map((path) => ({ url: `${appUrl}${path || "/"}` })),
    ...categories.map((category) => ({ url: `${appUrl}/categories/${category.slug}`, lastModified: category.updatedAt })),
    ...products.map((product) => ({ url: `${appUrl}/products/${product.slug}`, lastModified: product.updatedAt })),
  ];
}
