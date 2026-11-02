"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { createProduct, deleteProduct, setPublished, updateProduct, type VariantInput } from "@/lib/catalog";
import { assertCouponShape } from "@/lib/coupons";
import { prisma } from "@/lib/db";
import { isCommerceError } from "@/lib/errors";
import { storeImage } from "@/lib/images";
import { parseMoney } from "@/lib/money";
import { markCashCollected, refundOrder, updateOrderStatus } from "@/lib/orders";
import { canManageCatalog, canManageContent, canManageCoupons, canManageCustomers, canManageOrders, canManageShipping, canManageStaff, isRole } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import type { OrderStatus } from "@prisma/client";

function fail(error: unknown): never {
  if (isCommerceError(error)) throw new Error(error.message);
  throw error;
}

async function actor() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  return user;
}

function variantsFromForm(raw: string, productPrice: number): VariantInput[] {
  const parsed = JSON.parse(raw || "[]") as {
    id?: string;
    sku: string;
    size?: string;
    color?: string;
    optionLabel?: string;
    price?: string;
    salePrice?: string;
    stock?: string;
  }[];
  return parsed.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    size: variant.size || null,
    color: variant.color || null,
    optionLabel: variant.optionLabel || null,
    priceCents: variant.price ? parseMoney(variant.price) : null,
    salePriceCents: variant.salePrice ? parseMoney(variant.salePrice) : null,
    stock: Number(variant.stock || 0),
  }));
}

async function saveImages(productId: string, formData: FormData, alt: string) {
  const files = formData.getAll("images").filter((file): file is File => file instanceof File && file.size > 0);
  let position = await prisma.productImage.count({ where: { productId } });
  for (const file of files) {
    const stored = await storeImage({ buffer: Buffer.from(await file.arrayBuffer()), keyPrefix: `products/${productId}`, altHint: alt });
    await prisma.productImage.create({ data: { productId, url: stored.url, alt, position: position++ } });
  }
  const remove = formData.getAll("removeImage").map(String);
  if (remove.length) await prisma.productImage.deleteMany({ where: { id: { in: remove }, productId } });
}

export async function saveProductAction(formData: FormData) {
  const user = await actor();
  if (!canManageCatalog(user.role)) fail(new Error("Forbidden"));
  try {
    const priceCents = parseMoney(String(formData.get("price") || ""));
    if (priceCents == null) throw new Error("Enter a price.");
    const saleRaw = String(formData.get("salePrice") || "");
    const input = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      categoryId: String(formData.get("categoryId") || ""),
      priceCents,
      salePriceCents: saleRaw.trim() ? parseMoney(saleRaw) : null,
      featured: formData.get("featured") === "on",
      isNew: formData.get("isNew") === "on",
      isBestseller: formData.get("isBestseller") === "on",
      published: formData.get("published") === "on",
      backorderEnabled: formData.get("backorderEnabled") === "on",
      lowStockThreshold: Number(formData.get("lowStockThreshold") || 5),
      variants: variantsFromForm(String(formData.get("variants") || "[]"), priceCents),
    };
    const id = String(formData.get("id") || "");
    const product = id ? await updateProduct(user, id, input) : await createProduct(user, input);
    await saveImages(product.id, formData, product.name);
    revalidatePath("/shop");
    revalidatePath(`/products/${product.slug}`);
    redirect("/admin/products");
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: error instanceof Error ? error.message : "Could not save the product." };
  }
}

export async function deleteProductAction(formData: FormData) {
  const user = await actor();
  if (String(formData.get("confirm") || "") !== "DELETE") return { error: "Type DELETE to confirm." };
  try {
    await deleteProduct(user, String(formData.get("id") || ""));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not delete." };
  }
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function bulkProductsAction(formData: FormData) {
  const user = await actor();
  const ids = formData.getAll("ids").map(String);
  const action = String(formData.get("bulk") || "");
  if (action === "publish") await setPublished(user, ids, true);
  if (action === "hide") await setPublished(user, ids, false);
  if (action === "category") {
    if (!canManageCatalog(user.role)) return { error: "Forbidden" };
    await prisma.product.updateMany({ where: { id: { in: ids } }, data: { categoryId: String(formData.get("categoryId") || "") } });
    await audit(user, "product.bulkCategory", "Product", null, { ids });
  }
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function saveCategoryAction(formData: FormData) {
  const user = await actor();
  if (!canManageCatalog(user.role)) return { error: "Forbidden" };
  const name = String(formData.get("name") || "").trim();
  const id = String(formData.get("id") || "");
  const data = {
    name,
    slug: slugify(String(formData.get("slug") || name)),
    description: String(formData.get("description") || ""),
    position: Number(formData.get("position") || 0),
    published: formData.get("published") === "on",
  };
  const category = id
    ? await prisma.category.update({ where: { id }, data })
    : await prisma.category.create({ data });
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const stored = await storeImage({ buffer: Buffer.from(await file.arrayBuffer()), keyPrefix: "categories", altHint: name });
    await prisma.category.update({ where: { id: category.id }, data: { imageUrl: stored.url } });
  }
  await audit(user, id ? "category.update" : "category.create", "Category", category.id);
  revalidatePath("/categories");
}

export async function deleteCategoryAction(formData: FormData) {
  const user = await actor();
  if (!canManageCatalog(user.role)) return { error: "Forbidden" };
  const id = String(formData.get("id") || "");
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return { error: "Move products out of this category before deleting it." };
  await prisma.category.delete({ where: { id } });
  await audit(user, "category.delete", "Category", id);
  revalidatePath("/categories");
}

export async function saveCouponAction(formData: FormData) {
  const user = await actor();
  if (!canManageCoupons(user.role)) return { error: "Forbidden" };
  const type = String(formData.get("type") || "PERCENT") as "PERCENT" | "FIXED" | "FREE_SHIPPING";
  const amount = type === "FREE_SHIPPING" ? 0 : type === "PERCENT" ? Number(formData.get("amount") || 0) : parseMoney(String(formData.get("amount") || "")) || 0;
  try {
    assertCouponShape({ type, amount, minSubtotalCents: parseMoney(String(formData.get("min") || "0")) || 0 });
    const coupon = await prisma.coupon.create({
      data: {
        code: String(formData.get("code") || "").trim().toUpperCase(),
        type,
        amount,
        minSubtotalCents: parseMoney(String(formData.get("min") || "0")) || 0,
        startsAt: formData.get("startsAt") ? new Date(String(formData.get("startsAt"))) : null,
        endsAt: formData.get("endsAt") ? new Date(String(formData.get("endsAt"))) : null,
        usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : null,
        perCustomerLimit: formData.get("perCustomerLimit") ? Number(formData.get("perCustomerLimit")) : null,
        active: formData.get("active") === "on",
      },
    });
    const productId = String(formData.get("productId") || "");
    const categoryId = String(formData.get("categoryId") || "");
    if (productId) await prisma.couponProduct.create({ data: { couponId: coupon.id, productId } });
    if (categoryId) await prisma.couponCategory.create({ data: { couponId: coupon.id, categoryId } });
    await audit(user, "coupon.create", "Coupon", coupon.id, { code: coupon.code });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the coupon." };
  }
  revalidatePath("/admin/coupons");
}

export async function saveShippingAction(formData: FormData) {
  const user = await actor();
  if (!canManageShipping(user.role)) return { error: "Forbidden" };
  const zone = await prisma.shippingZone.create({
    data: {
      name: String(formData.get("zone") || "Zone"),
      countries: String(formData.get("countries") || "LB").split(",").map((item) => item.trim().toUpperCase()).filter(Boolean),
      areas: String(formData.get("areas") || "").split(",").map((item) => item.trim()).filter(Boolean),
      methods: {
        create: {
          name: String(formData.get("method") || "Delivery"),
          feeCents: parseMoney(String(formData.get("fee") || "0")) || 0,
          estimateMinDays: Number(formData.get("minDays") || 1),
          estimateMaxDays: Number(formData.get("maxDays") || 3),
        },
      },
    },
  });
  await audit(user, "shipping.create", "ShippingZone", zone.id);
  revalidatePath("/admin/shipping");
}

export async function saveThresholdAction(formData: FormData) {
  const user = await actor();
  if (!canManageShipping(user.role)) return { error: "Forbidden" };
  const value = String(formData.get("freeShipping") || "").trim();
  await prisma.siteContent.update({
    where: { id: "site" },
    data: { freeShippingThresholdCents: value ? parseMoney(value) : null },
  });
  await audit(user, "shipping.threshold", "SiteContent", "site");
  revalidatePath("/checkout");
}

export async function saveContentAction(formData: FormData) {
  const user = await actor();
  if (!canManageContent(user.role)) return { error: "Forbidden" };
  const featured = formData.getAll("featuredCategoryIds").map(String);
  await prisma.siteContent.upsert({
    where: { id: "site" },
    create: { id: "site", heroHeadline: "HyCare", heroSubhead: "", brandDescription: "", aboutText: "", shippingPolicy: "", returnsPolicy: "", privacyPolicy: "", termsPolicy: "" },
    update: {},
  });
  const data: Record<string, unknown> = {
    heroHeadline: String(formData.get("heroHeadline") || ""),
    heroSubhead: String(formData.get("heroSubhead") || ""),
    brandDescription: String(formData.get("brandDescription") || ""),
    aboutText: String(formData.get("aboutText") || ""),
    promoEnabled: formData.get("promoEnabled") === "on",
    promoTitle: String(formData.get("promoTitle") || ""),
    promoBody: String(formData.get("promoBody") || ""),
    promoHref: String(formData.get("promoHref") || "") || null,
    featuredCategoryIds: featured,
    contactEmail: String(formData.get("contactEmail") || ""),
    contactPhone: String(formData.get("contactPhone") || ""),
    contactAddress: String(formData.get("contactAddress") || ""),
    instagramUrl: String(formData.get("instagramUrl") || "") || null,
    facebookUrl: String(formData.get("facebookUrl") || "") || null,
    tiktokUrl: String(formData.get("tiktokUrl") || "") || null,
    shippingPolicy: String(formData.get("shippingPolicy") || ""),
    returnsPolicy: String(formData.get("returnsPolicy") || ""),
    privacyPolicy: String(formData.get("privacyPolicy") || ""),
    termsPolicy: String(formData.get("termsPolicy") || ""),
    freeShippingThresholdCents: parseMoney(String(formData.get("freeShipping") || "")) ,
    taxRateBps: Number(formData.get("taxRateBps") || 0),
    allowGuestCheckout: formData.get("allowGuestCheckout") === "on",
    currency: String(formData.get("currency") || "USD"),
  };
  const hero = formData.get("hero");
  if (hero instanceof File && hero.size > 0) {
    const stored = await storeImage({ buffer: Buffer.from(await hero.arrayBuffer()), keyPrefix: "content", altHint: "HyCare hero" });
    data.heroImageUrl = stored.url;
  }
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const stored = await storeImage({ buffer: Buffer.from(await logo.arrayBuffer()), keyPrefix: "content", altHint: "HyCare logo" });
    data.logoUrl = stored.url;
  }
  await prisma.siteContent.update({ where: { id: "site" }, data });
  await audit(user, "content.update", "SiteContent", "site");
  revalidatePath("/");
  revalidatePath("/admin/content");
}

export async function orderStatusAction(formData: FormData) {
  const user = await actor();
  try {
    await updateOrderStatus(user, String(formData.get("id") || ""), String(formData.get("status") || "") as OrderStatus, {
      carrier: String(formData.get("carrier") || ""),
      number: String(formData.get("tracking") || ""),
    });
    if (formData.get("collect") === "1") await markCashCollected(user, String(formData.get("id") || ""));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the order." };
  }
  revalidatePath("/admin/orders");
}

export async function refundAction(formData: FormData) {
  const user = await actor();
  try {
    await refundOrder(user, String(formData.get("id") || ""), parseMoney(String(formData.get("amount") || "")) || 0, String(formData.get("reason") || ""));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not refund." };
  }
  revalidatePath("/admin/orders");
}

export async function disableCustomerAction(formData: FormData) {
  const user = await actor();
  if (!canManageCustomers(user.role)) return { error: "Forbidden" };
  const id = String(formData.get("id") || "");
  const customer = await prisma.user.findUnique({ where: { id } });
  if (!customer || customer.role === "OWNER") return { error: "That account cannot be disabled." };
  await prisma.user.update({ where: { id }, data: { disabled: formData.get("disabled") === "1" } });
  await prisma.session.deleteMany({ where: { userId: id } });
  await audit(user, "customer.disable", "User", id, { disabled: formData.get("disabled") === "1" });
  revalidatePath("/admin/customers");
}

export async function createStaffAction(formData: FormData) {
  const user = await actor();
  if (!canManageStaff(user.role)) return { error: "Only the owner can add staff." };
  const role = String(formData.get("role") || "");
  if (!isRole(role) || role === "CUSTOMER") return { error: "Choose a staff role." };
  const email = String(formData.get("email") || "").toLowerCase();
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "Staff");
  const created = await auth.api.signUpEmail({ body: { email, password, name } });
  await prisma.user.update({ where: { id: created.user.id }, data: { role, emailVerified: true } });
  await audit(user, "staff.create", "User", created.user.id, { role });
  revalidatePath("/admin/staff");
}
