import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { prisma } from "@/lib/db";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !canManageCatalog(user.role)) redirect("/admin");
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { images: true, variants: { orderBy: { position: "asc" } } } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!product) notFound();
  return <ProductForm categories={categories} product={product} />;
}
