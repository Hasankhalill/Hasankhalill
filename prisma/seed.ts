import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { starterContent } from "../src/lib/content";
import { storage } from "../src/lib/storage";

const prisma = new PrismaClient();

const categories = [
  { name: "Skin care", slug: "skin-care", description: "Cleansers, masks, and daily skin care.", image: "mask.jpg", position: 1 },
  { name: "Hair care", slug: "hair-care", description: "Oils and care for hair and scalp.", image: "oil.jpg", position: 2 },
  { name: "Body care", slug: "body-care", description: "Lotions and simple body care.", image: "lotion.jpg", position: 3 },
  { name: "Hand and hygiene", slug: "hand-and-hygiene", description: "Soaps and hand care.", image: "soap.jpg", position: 4 },
  { name: "Home fragrance", slug: "home-fragrance", description: "Candles and room scent.", image: "candle.jpg", position: 5 },
  { name: "Laundry and home", slug: "laundry-and-home", description: "Care for linens and the rooms you live in.", image: "home.jpg", position: 6 },
];

async function imageUrl(file: string, key: string) {
  const body = await readFile(path.join(process.cwd(), "prisma", "sample-images", file));
  const stored = await storage().put({ key, body, contentType: "image/jpeg" });
  return stored.url;
}

async function main() {
  const existing = await prisma.product.count();
  if (existing > 0) {
    console.log("Catalog already has products. Seed skipped.");
    return;
  }
  const heroImageUrl = await imageUrl("hero.jpg", "content/hero.jpg");
  await prisma.siteContent.upsert({
    where: { id: "site" },
    update: { heroImageUrl },
    create: { ...starterContent, heroImageUrl },
  });
  const categoryIds: Record<string, string> = {};
  for (const category of categories) {
    const imageUrlValue = await imageUrl(category.image, `categories/${category.slug}.jpg`);
    const row = await prisma.category.create({
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: imageUrlValue,
        position: category.position,
      },
    });
    categoryIds[category.slug] = row.id;
  }
  const products = [
    {
      name: "Lavender shea soap",
      slug: "lavender-shea-soap",
      description: "A sample soap bar photographed without a brand label. Edit or delete it from admin.",
      category: "hand-and-hygiene",
      priceCents: 800,
      salePriceCents: null,
      featured: true,
      isBestseller: true,
      isNew: false,
      image: "soap.jpg",
      variants: [
        { sku: "SOAP-BAR", size: "Single bar", stock: 24 },
        { sku: "SOAP-TRIO", size: "Trio", priceCents: 2100, stock: 12 },
      ],
    },
    {
      name: "Cedar glass candle",
      slug: "cedar-glass-candle",
      description: "A sample candle for the home fragrance category. The sale price is stored on the product and the percent off is calculated.",
      category: "home-fragrance",
      priceCents: 2800,
      salePriceCents: 2200,
      featured: true,
      isBestseller: false,
      isNew: false,
      image: "candle.jpg",
      variants: [{ sku: "CANDLE-200", size: "200 g", stock: 15 }],
    },
    {
      name: "Amber scalp oil",
      slug: "amber-scalp-oil",
      description: "A sample dropper bottle with no brand name on the glass. Stock is real and can be changed in admin.",
      category: "hair-care",
      priceCents: 1900,
      salePriceCents: null,
      featured: false,
      isBestseller: false,
      isNew: true,
      image: "oil.jpg",
      variants: [
        { sku: "OIL-30", size: "30 ml", stock: 18 },
        { sku: "OIL-50", size: "50 ml", priceCents: 2600, stock: 8 },
      ],
    },
    {
      name: "Unscented pump lotion",
      slug: "unscented-pump-lotion",
      description: "A plain pump bottle from a sample photo. The sale price is below the regular price.",
      category: "body-care",
      priceCents: 1600,
      salePriceCents: 1300,
      featured: false,
      isBestseller: true,
      isNew: false,
      image: "lotion.jpg",
      variants: [{ sku: "LOTION-250", size: "250 ml", stock: 20 }],
    },
    {
      name: "Warm light bottle set",
      slug: "warm-light-bottle-set",
      description: "A sample set of unlabeled bottles. This is catalog sample data, not a record of a sale.",
      category: "body-care",
      priceCents: 4200,
      salePriceCents: null,
      featured: true,
      isBestseller: false,
      isNew: true,
      image: "set.jpg",
      variants: [{ sku: "SET-WARM", size: "Set", stock: 6 }],
    },
    {
      name: "Clay comfort mask",
      slug: "clay-comfort-mask",
      description: "A lifestyle photo of a clay mask. The product row is sample data and can be removed.",
      category: "skin-care",
      priceCents: 1800,
      salePriceCents: 1500,
      featured: false,
      isBestseller: false,
      isNew: true,
      image: "mask.jpg",
      variants: [{ sku: "MASK-100", size: "100 ml", stock: 10 }],
    },
  ];
  for (const product of products) {
    const url = await imageUrl(product.image, `products/${product.slug}.jpg`);
    await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description,
        categoryId: categoryIds[product.category],
        priceCents: product.priceCents,
        salePriceCents: product.salePriceCents,
        featured: product.featured,
        isBestseller: product.isBestseller,
        isNew: product.isNew,
        published: true,
        images: { create: [{ url, alt: product.name, position: 0 }] },
        variants: {
          create: product.variants.map((variant, index) => ({
            sku: variant.sku,
            size: variant.size,
            priceCents: "priceCents" in variant ? variant.priceCents : null,
            stock: variant.stock,
            position: index,
          })),
        },
      },
    });
  }
  await prisma.shippingZone.create({
    data: {
      name: "Beirut",
      countries: ["LB"],
      areas: ["Beirut"],
      methods: { create: { name: "Beirut delivery", feeCents: 300, estimateMinDays: 1, estimateMaxDays: 2 } },
    },
  });
  await prisma.shippingZone.create({
    data: {
      name: "Rest of Lebanon",
      countries: ["LB"],
      areas: [],
      methods: { create: { name: "Lebanon delivery", feeCents: 500, estimateMinDays: 2, estimateMaxDays: 5 } },
    },
  });
  await prisma.coupon.create({
    data: { code: "CARE10", type: "PERCENT", amount: 10, active: true, minSubtotalCents: 0 },
  });
  await prisma.siteContent.update({
    where: { id: "site" },
    data: { featuredCategoryIds: Object.values(categoryIds).slice(0, 6) },
  });
  console.log("Sample catalog inserted. No orders were created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
