import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { audit } from "./audit";
import { CommerceError } from "./errors";
import { assertPricePair, effectivePrice, variantTitle } from "./money";
import { canManageCatalog, type Actor } from "./rbac";
import { slugify } from "./slug";

export type VariantInput = {
  id?: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  optionLabel?: string | null;
  priceCents?: number | null;
  salePriceCents?: number | null;
  stock: number;
  lowStockThreshold?: number | null;
};

export type ProductInput = {
  name: string;
  description: string;
  categoryId: string;
  priceCents: number;
  salePriceCents?: number | null;
  featured?: boolean;
  isNew?: boolean;
  isBestseller?: boolean;
  published?: boolean;
  backorderEnabled?: boolean;
  lowStockThreshold?: number;
  variants: VariantInput[];
};

function requireCatalog(actor: Actor) {
  if (!canManageCatalog(actor.role)) {
    throw new CommerceError("FORBIDDEN", "You cannot change the catalog.");
  }
}

function cleanProduct(input: ProductInput) {
  assertPricePair(input.priceCents, input.salePriceCents ?? null);
  if (!input.name.trim() || !input.description.trim()) {
    throw new CommerceError("INVALID_PRODUCT", "Name and description are required.");
  }
  if (input.variants.length === 0) {
    throw new CommerceError("INVALID_PRODUCT", "Add at least one variant.");
  }
  const skus = new Set<string>();
  for (const variant of input.variants) {
    const sku = variant.sku.trim();
    if (!sku) throw new CommerceError("INVALID_PRODUCT", "Every variant needs a SKU.");
    if (skus.has(sku)) throw new CommerceError("INVALID_PRODUCT", "SKUs must be unique.");
    skus.add(sku);
    if (!Number.isInteger(variant.stock)) throw new CommerceError("INVALID_PRODUCT", "Stock must be a whole number.");
    if (variant.priceCents != null || variant.salePriceCents != null) {
      assertPricePair(variant.priceCents ?? input.priceCents, variant.salePriceCents ?? null);
    }
  }
}

async function uniqueSlug(name: string, currentId?: string) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (true) {
    const existing = await prisma.product.findUnique({ where: { slug } });
    if (!existing || existing.id === currentId) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function createProduct(actor: Actor, input: ProductInput) {
  requireCatalog(actor);
  cleanProduct(input);
  const slug = await uniqueSlug(input.name);
  const product = await prisma.product.create({
    data: {
      name: input.name.trim(),
      slug,
      description: input.description.trim(),
      categoryId: input.categoryId,
      priceCents: input.priceCents,
      salePriceCents: input.salePriceCents ?? null,
      featured: Boolean(input.featured),
      isNew: Boolean(input.isNew),
      isBestseller: Boolean(input.isBestseller),
      published: Boolean(input.published),
      backorderEnabled: Boolean(input.backorderEnabled),
      lowStockThreshold: input.lowStockThreshold ?? 5,
      variants: {
        create: input.variants.map((variant, index) => ({
          sku: variant.sku.trim(),
          size: variant.size || null,
          color: variant.color || null,
          optionLabel: variant.optionLabel || null,
          priceCents: variant.priceCents ?? null,
          salePriceCents: variant.salePriceCents ?? null,
          stock: variant.stock,
          lowStockThreshold: variant.lowStockThreshold ?? null,
          position: index,
        })),
      },
    },
    include: { variants: true },
  });
  await audit(actor, "product.create", "Product", product.id, { name: product.name });
  return product;
}

export async function updateProduct(actor: Actor, productId: string, input: ProductInput) {
  requireCatalog(actor);
  cleanProduct(input);
  const current = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!current) throw new CommerceError("NOT_FOUND", "Product not found.");
  const slug = current.name === input.name.trim() ? current.slug : await uniqueSlug(input.name, productId);
  const incomingIds = new Set(input.variants.map((variant) => variant.id).filter(Boolean));
  const removed = current.variants.filter((variant) => !incomingIds.has(variant.id));
  for (const variant of removed) {
    const ordered = await prisma.orderItem.count({ where: { variantId: variant.id } });
    if (ordered > 0) {
      throw new CommerceError("INVALID_PRODUCT", "A variant that has been ordered cannot be removed. Hide the product instead.");
    }
  }
  const product = await prisma.$transaction(async (tx) => {
    if (removed.length) {
      await tx.variant.deleteMany({ where: { id: { in: removed.map((variant) => variant.id) } } });
    }
    for (const [index, variant] of input.variants.entries()) {
      const data = {
        sku: variant.sku.trim(),
        size: variant.size || null,
        color: variant.color || null,
        optionLabel: variant.optionLabel || null,
        priceCents: variant.priceCents ?? null,
        salePriceCents: variant.salePriceCents ?? null,
        stock: variant.stock,
        lowStockThreshold: variant.lowStockThreshold ?? null,
        position: index,
      };
      if (variant.id && current.variants.some((row) => row.id === variant.id)) {
        await tx.variant.update({ where: { id: variant.id }, data });
      } else {
        await tx.variant.create({ data: { ...data, productId } });
      }
    }
    return tx.product.update({
      where: { id: productId },
      data: {
        name: input.name.trim(),
        slug,
        description: input.description.trim(),
        categoryId: input.categoryId,
        priceCents: input.priceCents,
        salePriceCents: input.salePriceCents ?? null,
        featured: Boolean(input.featured),
        isNew: Boolean(input.isNew),
        isBestseller: Boolean(input.isBestseller),
        published: Boolean(input.published),
        backorderEnabled: Boolean(input.backorderEnabled),
        lowStockThreshold: input.lowStockThreshold ?? 5,
      },
      include: { variants: true, images: true, category: true },
    });
  });
  await audit(actor, "product.update", "Product", product.id, { name: product.name });
  return product;
}

export async function deleteProduct(actor: Actor, productId: string) {
  requireCatalog(actor);
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { variants: true } });
  if (!product) throw new CommerceError("NOT_FOUND", "Product not found.");
  const ordered = await prisma.orderItem.count({ where: { variantId: { in: product.variants.map((variant) => variant.id) } } });
  if (ordered > 0) {
    throw new CommerceError("INVALID_PRODUCT", "This product is on existing orders. Hide it instead of deleting it.");
  }
  await prisma.product.delete({ where: { id: productId } });
  await audit(actor, "product.delete", "Product", productId, { name: product.name });
}

export async function setPublished(actor: Actor, productIds: string[], published: boolean) {
  requireCatalog(actor);
  await prisma.product.updateMany({ where: { id: { in: productIds } }, data: { published } });
  await audit(actor, "product.bulkPublish", "Product", null, { productIds, published });
}

export type CatalogFilters = {
  category?: string;
  minCents?: number;
  maxCents?: number;
  availability?: "in" | "out";
  rating?: number;
  sort?: "price_asc" | "price_desc" | "newest" | "popular" | "rating";
  q?: string;
  saleOnly?: boolean;
  includeHidden?: boolean;
};

export async function queryCatalog(filters: CatalogFilters) {
  const sort = filters.sort || "newest";
  const orderSql =
    sort === "price_asc"
      ? Prisma.sql`price ASC`
      : sort === "price_desc"
        ? Prisma.sql`price DESC`
        : sort === "popular"
          ? Prisma.sql`sold DESC, p."createdAt" DESC`
          : sort === "rating"
            ? Prisma.sql`rating DESC, p."createdAt" DESC`
            : Prisma.sql`p."createdAt" DESC`;
  const q = filters.q?.trim() ? `%${filters.q.trim()}%` : null;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH priced AS (
      SELECT p.id,
        p."createdAt",
        MIN(COALESCE(v."salePriceCents", v."priceCents", p."salePriceCents", p."priceCents")) AS price,
        COALESCE(SUM(v.stock), 0) AS stock,
        BOOL_OR(p."backorderEnabled") AS backorder,
        COALESCE(AVG(r.rating) FILTER (WHERE r.published), 0) AS rating,
        COALESCE(SUM(oi.quantity), 0) AS sold,
        BOOL_OR(v."salePriceCents" IS NOT NULL OR (v."priceCents" IS NULL AND p."salePriceCents" IS NOT NULL)) AS on_sale
      FROM "Product" p
      JOIN "Variant" v ON v."productId" = p.id
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Review" r ON r."productId" = p.id
      LEFT JOIN "OrderItem" oi ON oi."variantId" = v.id
      WHERE (${filters.includeHidden ?? false} OR p.published = true)
        AND (${filters.category ?? null}::text IS NULL OR c.slug = ${filters.category ?? null})
        AND (${q}::text IS NULL OR p.name ILIKE ${q} OR p.description ILIKE ${q} OR v.sku ILIKE ${q})
      GROUP BY p.id
    )
    SELECT p.id
    FROM priced
    JOIN "Product" p ON p.id = priced.id
    WHERE (${filters.minCents ?? null}::int IS NULL OR priced.price >= ${filters.minCents ?? null})
      AND (${filters.maxCents ?? null}::int IS NULL OR priced.price <= ${filters.maxCents ?? null})
      AND (${filters.availability ?? null}::text IS NULL
        OR (${filters.availability ?? null} = 'in' AND (priced.stock > 0 OR priced.backorder))
        OR (${filters.availability ?? null} = 'out' AND priced.stock <= 0 AND NOT priced.backorder))
      AND (${filters.rating ?? null}::int IS NULL OR priced.rating >= ${filters.rating ?? null})
      AND (${filters.saleOnly ?? false} = false OR priced.on_sale)
    ORDER BY ${orderSql}
    LIMIT 200
  `;
  if (rows.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
      category: true,
      reviews: { where: { published: true }, select: { rating: true } },
    },
  });
  const order = new Map(rows.map((row, index) => [row.id, index]));
  return products
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
    .map((product) => decorateProduct(product));
}

type Decorated<T extends { variants: unknown[] }> = T & {
  minUnitCents: number;
  percentOff: number | null;
  rating: number;
  ratingCount: number;
  inStock: boolean;
  stock: number;
  titleFor: (variant: T["variants"][number]) => string;
};

export function decorateProduct<
  T extends {
    priceCents: number;
    salePriceCents: number | null;
    variants: { priceCents: number | null; salePriceCents: number | null; stock: number; size: string | null; color: string | null; optionLabel: string | null }[];
    reviews?: { rating: number }[];
    backorderEnabled: boolean;
    lowStockThreshold: number;
  },
>(product: T): Decorated<T> {
  const prices = product.variants.map((variant) => effectivePrice(product, variant));
  const unitPrices = prices.map((price) => price.unitPriceCents);
  const minUnit = unitPrices.length ? Math.min(...unitPrices) : product.priceCents;
  const ratingCount = product.reviews?.length ?? 0;
  const rating = ratingCount ? product.reviews!.reduce((sum, review) => sum + review.rating, 0) / ratingCount : 0;
  const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  return {
    ...product,
    minUnitCents: minUnit,
    percentOff: prices.find((price) => price.percentOff)?.percentOff ?? null,
    rating,
    ratingCount,
    inStock: product.backorderEnabled || stock > 0,
    stock,
    titleFor: (variant) => variantTitle(variant),
  };
}

export async function getProductBySlug(slug: string, opts?: { allowHidden?: boolean }) {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { position: "asc" } },
      category: true,
      reviews: { where: { published: true }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!product || (!product.published && !opts?.allowHidden)) return null;
  return decorateProduct(product);
}
