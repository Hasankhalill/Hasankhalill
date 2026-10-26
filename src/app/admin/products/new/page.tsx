import { ProductForm } from "@/components/product-form";
import { prisma } from "@/lib/db";
import { canManageCatalog } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const user = await getCurrentUser();
  if (!user || !canManageCatalog(user.role)) redirect("/admin");
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return <ProductForm categories={categories} />;
}
