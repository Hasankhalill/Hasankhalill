import { cookies } from "next/headers";
import { prisma } from "./db";
import { CommerceError } from "./errors";
import { effectivePrice } from "./money";
import { availableQuantity } from "./inventory";

const COOKIE = "hycare_cart";

export async function readCartId(userId?: string | null) {
  if (userId) {
    const cart = await prisma.cart.findUnique({ where: { userId } });
    return cart?.id ?? null;
  }
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

export async function ensureCart(userId?: string | null) {
  if (userId) {
    const existing = await prisma.cart.findUnique({ where: { userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId } });
  }
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    const existing = await prisma.cart.findFirst({ where: { id, userId: null } });
    if (existing) return existing;
  }
  const cart = await prisma.cart.create({ data: {} });
  jar.set(COOKIE, cart.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return cart;
}

export async function cartDetails(cartId: string | null) {
  if (!cartId) return null;
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } },
        },
      },
    },
  });
}

export async function addToCart(input: { userId?: string | null; variantId: string; quantity: number }) {
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99) {
    throw new CommerceError("INVALID_QUANTITY", "Choose a quantity between 1 and 99.");
  }
  const variant = await prisma.variant.findUnique({ where: { id: input.variantId }, include: { product: true } });
  if (!variant || !variant.product.published) {
    throw new CommerceError("UNAVAILABLE", "That product is not available.");
  }
  const cart = await ensureCart(input.userId);
  await prisma.$transaction(async (tx) => {
    const current = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } } });
    const next = (current?.quantity ?? 0) + input.quantity;
    const available = await availableQuantity(tx, variant.id, variant.stock, variant.product.backorderEnabled);
    if (next > available) throw new CommerceError("OUT_OF_STOCK", "There is not enough stock for that quantity.");
    await tx.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: { cartId: cart.id, variantId: variant.id, quantity: next },
      update: { quantity: next },
    });
  });
  return cart.id;
}

export async function updateCartQuantity(input: { userId?: string | null; variantId: string; quantity: number }) {
  const cartId = await readCartId(input.userId);
  if (!cartId) return;
  if (input.quantity <= 0) {
    await prisma.cartItem.deleteMany({ where: { cartId, variantId: input.variantId } });
    return;
  }
  const variant = await prisma.variant.findUnique({ where: { id: input.variantId }, include: { product: true } });
  if (!variant) throw new CommerceError("UNAVAILABLE", "That product is not available.");
  await prisma.$transaction(async (tx) => {
    const available = await availableQuantity(tx, variant.id, variant.stock, variant.product.backorderEnabled);
    if (input.quantity > available) throw new CommerceError("OUT_OF_STOCK", "There is not enough stock for that quantity.");
    await tx.cartItem.update({
      where: { cartId_variantId: { cartId, variantId: input.variantId } },
      data: { quantity: input.quantity },
    });
  });
}

export async function removeCartItem(input: { userId?: string | null; variantId: string }) {
  const cartId = await readCartId(input.userId);
  if (!cartId) return;
  await prisma.cartItem.deleteMany({ where: { cartId, variantId: input.variantId } });
}

export async function setCartCoupon(input: { userId?: string | null; code: string | null }) {
  const cart = await ensureCart(input.userId);
  const current = await prisma.cart.findUnique({ where: { id: cart.id } });
  if (input.code && current?.couponCode && current.couponCode !== input.code.trim().toUpperCase()) {
    throw new CommerceError("COUPON_STACK", "Only one coupon can be used. Remove the current coupon first.");
  }
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponCode: input.code ? input.code.trim().toUpperCase() : null },
  });
}

export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const guestId = jar.get(COOKIE)?.value;
  if (!guestId) return;
  const userCart = await ensureCart(userId);
  if (guestId === userCart.id) return;
  const guestItems = await prisma.cartItem.findMany({ where: { cartId: guestId } });
  for (const item of guestItems) {
    await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
      create: { cartId: userCart.id, variantId: item.variantId, quantity: item.quantity },
      update: { quantity: { increment: item.quantity } },
    });
  }
  await prisma.cart.delete({ where: { id: guestId } }).catch(() => undefined);
  jar.delete(COOKIE);
}

export function lineFromVariant(item: {
  quantity: number;
  variant: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    optionLabel: string | null;
    priceCents: number | null;
    salePriceCents: number | null;
    stock: number;
    product: { id: string; name: string; categoryId: string; priceCents: number; salePriceCents: number | null; published: boolean; backorderEnabled: boolean };
  };
}) {
  const price = effectivePrice(item.variant.product, item.variant);
  return {
    variantId: item.variant.id,
    productId: item.variant.product.id,
    categoryId: item.variant.product.categoryId,
    name: item.variant.product.name,
    sku: item.variant.sku,
    quantity: item.quantity,
    unitPriceCents: price.unitPriceCents,
    published: item.variant.product.published,
    backorderEnabled: item.variant.product.backorderEnabled,
    stock: item.variant.stock,
  };
}
