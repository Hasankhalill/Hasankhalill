import { prisma } from "./db";

export const starterContent = {
  id: "site",
  heroHeadline: "Care for the home you live in.",
  heroSubhead: "Skin, hair, body, and the rooms around them. Packed in Lebanon, with cash on delivery.",
  brandDescription: "HyCare is a home and personal care shop. Prices are calculated on the server, stock is real, and categories can be changed from the admin.",
  aboutText:
    "HyCare sells everyday home and personal care for delivery in Lebanon. This shop keeps its own catalog, orders, and staff roles. The starter products in a fresh database are sample data and can be edited or deleted.",
  promoEnabled: true,
  promoTitle: "Seasonal care, while supplies last",
  promoBody: "Sale prices on this shop are set in admin. The percent off is calculated from those prices.",
  promoHref: "/offers",
  shippingPolicy:
    "HyCare delivers in Lebanon. The fee and the estimate you see at checkout come from the shipping zone that matches your city or area. Cash is collected on delivery unless a card payment has been confirmed by the payment provider.",
  returnsPolicy:
    "Unopened items can be returned within 14 days of delivery. Write to the contact address saved in the shop settings and include your order number. Refunds restore stock once the order is marked refunded.",
  privacyPolicy:
    "We store the account, address, and order details needed to deliver your purchase. Passwords are hashed. Card numbers and CVVs are never stored. Payment status changes only after a confirmed cash-on-delivery order or a verified payment webhook.",
  termsPolicy:
    "Placing an order asks HyCare to reserve or sell the items shown, at the price calculated on the server. A card payment is not complete because a browser opened a success page. Lebanese card acquiring is not switched on.",
  contactAddress: "Beirut, Lebanon",
  allowGuestCheckout: true,
  currency: "USD",
  taxRateBps: 0,
  reservationMinutes: 30,
  freeShippingThresholdCents: 7500,
};

export async function getSiteContent() {
  const existing = await prisma.siteContent.findUnique({ where: { id: "site" } });
  if (existing) return existing;
  return prisma.siteContent.create({ data: starterContent });
}

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}
