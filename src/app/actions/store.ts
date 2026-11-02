"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { addToCart, mergeGuestCart, readCartId, removeCartItem, setCartCoupon, updateCartQuantity } from "@/lib/cart";
import { placeOrder } from "@/lib/checkout";
import { prisma } from "@/lib/db";
import { sendEmail, emailProviderName } from "@/lib/email";
import { isCommerceError } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { assertAddress } from "@/lib/shipping";

function fail(error: unknown) {
  if (isCommerceError(error)) return { error: error.message };
  console.error(error);
  return { error: "Something went wrong. No payment was captured." };
}

async function clientKey(suffix: string) {
  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${suffix}:${ip}`;
}

export async function addToCartAction(formData: FormData) {
  const user = await getCurrentUser();
  try {
    await rateLimit(await clientKey("cart"), 40, 60_000);
    await addToCart({
      userId: user?.id,
      variantId: String(formData.get("variantId") || ""),
      quantity: Number(formData.get("quantity") || 1),
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/cart");
  return { ok: true as const };
}

export async function updateQuantityAction(formData: FormData) {
  const user = await getCurrentUser();
  try {
    await updateCartQuantity({
      userId: user?.id,
      variantId: String(formData.get("variantId") || ""),
      quantity: Number(formData.get("quantity") || 0),
    });
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/cart");
}

export async function removeItemAction(formData: FormData) {
  const user = await getCurrentUser();
  await removeCartItem({ userId: user?.id, variantId: String(formData.get("variantId") || "") });
  revalidatePath("/cart");
}

export async function applyCouponAction(formData: FormData) {
  const user = await getCurrentUser();
  try {
    await rateLimit(await clientKey(`coupon:${user?.id || "guest"}`), 10, 60_000);
    const remove = formData.get("remove") === "1";
    await setCartCoupon({ userId: user?.id, code: remove ? null : String(formData.get("code") || "") });
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function checkoutAction(formData: FormData) {
  const user = await getCurrentUser();
  try {
    await rateLimit(await clientKey(`checkout:${user?.email || String(formData.get("email") || "")}`), 8, 10 * 60_000);
    const cartId = await readCartId(user?.id);
    if (!cartId) return { error: "Your cart is empty." };
    const address = {
      fullName: String(formData.get("fullName") || ""),
      phone: String(formData.get("phone") || ""),
      country: String(formData.get("country") || "LB"),
      city: String(formData.get("city") || ""),
      area: String(formData.get("area") || ""),
      street: String(formData.get("street") || ""),
      building: String(formData.get("building") || ""),
      extraDetails: String(formData.get("extraDetails") || ""),
      deliveryInstructions: String(formData.get("deliveryInstructions") || ""),
    };
    assertAddress(address);
    const result = await placeOrder({
      cartId,
      userId: user?.id ?? null,
      email: user?.email || String(formData.get("email") || ""),
      emailVerified: user ? user.emailVerified : true,
      contactName: address.fullName,
      phone: address.phone,
      address,
      shippingMethodId: String(formData.get("shippingMethodId") || ""),
      paymentMethod: String(formData.get("paymentMethod") || "COD") as "COD" | "STRIPE" | "AREEBA",
      idempotencyKey: String(formData.get("idempotencyKey") || ""),
      customerNote: String(formData.get("customerNote") || ""),
    });
    if (result.redirectUrl) redirect(result.redirectUrl);
    redirect(`/orders/${result.order.number}?token=${result.order.accessToken}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return fail(error);
  }
}

export async function saveAddressAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const address = {
    fullName: String(formData.get("fullName") || ""),
    phone: String(formData.get("phone") || ""),
    country: String(formData.get("country") || "LB"),
    city: String(formData.get("city") || ""),
    area: String(formData.get("area") || ""),
    street: String(formData.get("street") || ""),
    building: String(formData.get("building") || ""),
    extraDetails: String(formData.get("extraDetails") || ""),
    deliveryInstructions: String(formData.get("deliveryInstructions") || ""),
  };
  try {
    assertAddress(address);
  } catch (error) {
    return fail(error);
  }
  if (formData.get("isDefault") === "on") {
    await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  }
  await prisma.address.create({
    data: { ...address, userId: user.id, isDefault: formData.get("isDefault") === "on" },
  });
  revalidatePath("/account/addresses");
}

export async function newsletterAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  await prisma.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
  const mail = await sendEmail({
    to: email,
    subject: "HyCare newsletter",
    text: "You are on the HyCare list. This note is only delivered when email is configured.",
    html: "<p>You are on the HyCare list.</p>",
  });
  revalidatePath("/");
  return {
    ok: true as const,
    message: mail.delivered
      ? "You are on the list. A confirmation was sent."
      : "You are on the list. No confirmation email was sent, because email is not configured.",
  };
}

export async function contactAction(formData: FormData) {
  try {
    await rateLimit(await clientKey("contact"), 5, 10 * 60_000);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const message = String(formData.get("message") || "").trim();
    if (!name || !email || message.length < 5) return { error: "Add your name, email, and a message." };
    await prisma.contactMessage.create({ data: { name, email, message } });
    const content = await prisma.siteContent.findUnique({ where: { id: "site" } });
    const to = content?.contactEmail || process.env.OWNER_EMAIL;
    let delivered = false;
    if (to) {
      const mail = await sendEmail({
        to,
        subject: `HyCare contact from ${name}`,
        text: `${name} <${email}>\n\n${message}`,
        html: `<p>${name} &lt;${email}&gt;</p><p>${message}</p>`,
      });
      delivered = mail.delivered;
    }
    return {
      ok: true as const,
      message: delivered ? "Message sent." : "Message saved. It was not emailed, because email is not configured.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleWishlistAction(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("productId") || "");
  if (!user) redirect(`/login?next=/products/${String(formData.get("slug") || "")}`);
  const existing = await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (existing) await prisma.wishlistItem.delete({ where: { id: existing.id } });
  else await prisma.wishlistItem.create({ data: { userId: user.id, productId } });
  revalidatePath("/wishlist");
}

export async function mergeWishlistAction(productIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return;
  for (const productId of productIds) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) continue;
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId } },
      create: { userId: user.id, productId },
      update: {},
    });
  }
}

export async function reviewAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const productId = String(formData.get("productId") || "");
  const orderId = String(formData.get("orderId") || "");
  const rating = Number(formData.get("rating") || 0);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (rating < 1 || rating > 5 || !title || !body) return { error: "Add a rating from 1 to 5, a title, and a review." };
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id, status: "DELIVERED", items: { some: { productId } } },
  });
  if (!order) return { error: "Reviews are open after a delivered purchase of this product." };
  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: { productId, userId: user.id, orderId, rating, title, body },
    update: { rating, title, body, orderId },
  });
  revalidatePath("/account/orders");
}

export async function profileAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await prisma.user.update({
    where: { id: user.id },
    data: { name: String(formData.get("name") || user.name).trim(), phone: String(formData.get("phone") || "") || null },
  });
  revalidatePath("/account");
}

export async function closureAction() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await rateLimit(`closure:${user.id}`, 3, 24 * 60 * 60_000);
  await prisma.user.update({ where: { id: user.id }, data: { closureRequestedAt: new Date() } });
  revalidatePath("/account");
  const mail = await sendEmail({
    to: process.env.OWNER_EMAIL || user.email,
    subject: "HyCare account closure request",
    text: `${user.email} asked to close their HyCare account. The account is not deleted until staff handles it.`,
    html: `<p>${user.email} asked to close their HyCare account.</p>`,
  });
  return {
    ok: true as const,
    message: mail.delivered
      ? "Request recorded and emailed to the shop."
      : `Request recorded. ${emailProviderName() ? "The email failed." : "It was not emailed, because email is not configured."} The account is still active until staff closes it.`,
  };
}

export async function afterLoginAction() {
  const user = await getCurrentUser();
  if (!user) return;
  await mergeGuestCart(user.id);
}
