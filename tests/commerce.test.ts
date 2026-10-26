import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/lib/auth";
import { createProduct, deleteProduct, updateProduct } from "@/lib/catalog";
import { setCartCoupon } from "@/lib/cart";
import { placeOrder, getOrderForViewer } from "@/lib/checkout";
import { validateCoupon } from "@/lib/coupons";
import { dashboardSnapshot, salesSeries } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { CommerceError } from "@/lib/errors";
import { assertPricePair, percentOff } from "@/lib/money";
import { computeQuote } from "@/lib/quote";
import { applyStripeEvent, constructStripeEvent } from "@/lib/payments/stripe";
import { consumeRateLimit, rateLimit } from "@/lib/rate-limit";
import { updateOrderStatus } from "@/lib/orders";
import type { Role } from "@/lib/rbac";

const address = {
  fullName: "Hassan Khalil",
  phone: "+96103000000",
  country: "LB",
  city: "Beirut",
  area: "Hamra",
  street: "Hamra Street",
  building: "12",
};

function authHeaders() {
  return new Headers({ origin: "http://localhost:3000" });
}

async function resetDb() {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const list = rows.map((row) => `"${row.tablename.replaceAll('"', "")}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

async function actor(role: Role) {
  const id = `usr_${role.toLowerCase()}_${randomBytes(4).toString("hex")}`;
  const email = `${id}@hycare.test`;
  await prisma.user.create({
    data: { id, name: role, email, emailVerified: true, role },
  });
  return { id, email, role };
}

async function catalog(stock = 5) {
  const category = await prisma.category.create({ data: { name: "Soap", slug: `soap-${randomBytes(3).toString("hex")}` } });
  const product = await prisma.product.create({
    data: {
      name: "Olive soap",
      slug: `olive-soap-${randomBytes(3).toString("hex")}`,
      description: "A bar of soap.",
      categoryId: category.id,
      priceCents: 2000,
      published: true,
      variants: { create: { sku: `SKU-${randomBytes(3).toString("hex")}`, stock } },
    },
    include: { variants: true },
  });
  const zone = await prisma.shippingZone.create({
    data: {
      name: "Lebanon",
      countries: ["LB"],
      areas: [],
      methods: { create: { name: "Courier", feeCents: 500, estimateMinDays: 1, estimateMaxDays: 3 } },
    },
    include: { methods: true },
  });
  return { category, product, variant: product.variants[0], method: zone.methods[0] };
}

async function cartWith(variantId: string, quantity: number, couponCode?: string) {
  return prisma.cart.create({
    data: {
      couponCode,
      items: { create: { variantId, quantity } },
    },
  });
}

function checkoutInput(cartId: string, methodId: string, key: string, paymentMethod: "COD" | "STRIPE" | "AREEBA" = "COD") {
  return {
    cartId,
    userId: null,
    email: "guest@hycare.test",
    emailVerified: false,
    contactName: "Hassan Khalil",
    phone: "+96103000000",
    address,
    shippingMethodId: methodId,
    paymentMethod,
    idempotencyKey: key,
  };
}

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("register and login", () => {
  it("stores a hash, blocks unverified login, and does not claim the email was sent", async () => {
    const email = "customer@hycare.test";
    const password = "correct-horse";
    await auth.api.signUpEmail({
      body: { name: "Test Customer", email, password },
      headers: authHeaders(),
    });
    const user = await prisma.user.findUnique({ where: { email }, include: { accounts: true } });
    expect(user?.role).toBe("CUSTOMER");
    expect(user?.emailVerified).toBe(false);
    const hash = user?.accounts[0]?.password;
    expect(hash).toBeTruthy();
    expect(hash).not.toBe(password);
    expect(hash?.includes(password)).toBe(false);

    const outbox = await prisma.emailMessage.findFirst({ where: { toEmail: email } });
    expect(outbox?.status).toBe("NOT_SENT");

    await expect(
      auth.api.signInEmail({ body: { email, password }, headers: authHeaders() }),
    ).rejects.toMatchObject({ statusCode: 403 });

    await prisma.user.update({ where: { email }, data: { emailVerified: true } });
    const session = await auth.api.signInEmail({ body: { email, password }, headers: authHeaders() });
    expect(session.user.email).toBe(email);

    await prisma.user.update({ where: { email }, data: { disabled: true } });
    await expect(
      auth.api.signInEmail({ body: { email, password }, headers: authHeaders() }),
    ).rejects.toBeTruthy();
  });
});

describe("catalog and pricing", () => {
  it("creates, updates, and deletes products and rejects bad prices", async () => {
    const owner = await actor("OWNER");
    const category = await prisma.category.create({ data: { name: "Body", slug: "body" } });
    const created = await createProduct(owner, {
      name: "Daily lotion",
      description: "A plain lotion.",
      categoryId: category.id,
      priceCents: 2500,
      salePriceCents: 2000,
      published: true,
      variants: [{ sku: "LOTION-1", stock: 8 }],
    });
    expect(created.slug).toBe("daily-lotion");
    expect(percentOff(2500, 2000)).toBe(20);

    const updated = await updateProduct(owner, created.id, {
      name: "Daily lotion",
      description: "A plain lotion, updated.",
      categoryId: category.id,
      priceCents: 2500,
      salePriceCents: null,
      published: false,
      variants: [{ id: created.variants[0].id, sku: "LOTION-1", stock: 4 }],
    });
    expect(updated.published).toBe(false);
    expect(updated.variants[0].stock).toBe(4);

    await deleteProduct(owner, created.id);
    expect(await prisma.product.count()).toBe(0);

    expect(() => assertPricePair(-1, null)).toThrow(CommerceError);
    expect(() => assertPricePair(1000, 1500)).toThrow(CommerceError);
    await expect(
      createProduct(owner, {
        name: "Bad",
        description: "No",
        categoryId: category.id,
        priceCents: -5,
        variants: [{ sku: "BAD", stock: 1 }],
      }),
    ).rejects.toMatchObject({ code: "NEGATIVE_PRICE" });
  });

  it("computes cart totals from server prices", () => {
    const quote = computeQuote({
      lines: [
        { variantId: "v1", productId: "p1", categoryId: "c1", quantity: 2, unitPriceCents: 1500 },
        { variantId: "v2", productId: "p2", categoryId: "c1", quantity: 1, unitPriceCents: 1000 },
      ],
      coupon: { code: "TEN", type: "PERCENT", amount: 10, productIds: ["p1"], categoryIds: [] },
      shippingFeeCents: 500,
      taxRateBps: 1100,
      freeShippingThresholdCents: 10000,
    });
    expect(quote.subtotalCents).toBe(4000);
    expect(quote.eligibleSubtotalCents).toBe(3000);
    expect(quote.discountCents).toBe(300);
    expect(quote.shippingCents).toBe(500);
    expect(quote.taxCents).toBe(407);
    expect(quote.totalCents).toBe(4607);
  });
});

describe("coupons", () => {
  it("rejects expired, too-small, limited, and off-catalog coupons, and blocks stacking", async () => {
    const { product, category, variant } = await catalog();
    const other = await prisma.product.create({
      data: {
        name: "Other",
        slug: "other",
        description: "Other",
        categoryId: category.id,
        priceCents: 500,
        published: true,
        variants: { create: { sku: "OTHER", stock: 2 } },
      },
    });
    const line = { variantId: variant.id, productId: product.id, categoryId: category.id, quantity: 1, unitPriceCents: 2000 };
    await prisma.coupon.create({
      data: { code: "FUTURE", type: "PERCENT", amount: 10, startsAt: new Date(Date.now() + 86_400_000), active: true },
    });
    await prisma.coupon.create({
      data: { code: "MIN", type: "FIXED", amount: 100, minSubtotalCents: 5000, active: true },
    });
    await prisma.coupon.create({
      data: { code: "ONCE", type: "PERCENT", amount: 10, usageLimit: 1, usedCount: 1, active: true },
    });
    await prisma.coupon.create({
      data: {
        code: "SOAPONLY",
        type: "PERCENT",
        amount: 15,
        active: true,
        products: { create: { productId: other.id } },
      },
    });
    await expect(validateCoupon(prisma, { code: "future", lines: [line], subtotalCents: 2000, email: "a@hycare.test" })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    await expect(validateCoupon(prisma, { code: "MIN", lines: [line], subtotalCents: 2000, email: "a@hycare.test" })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    await expect(validateCoupon(prisma, { code: "ONCE", lines: [line], subtotalCents: 2000, email: "a@hycare.test" })).rejects.toMatchObject({ code: "COUPON_INVALID" });
    await expect(validateCoupon(prisma, { code: "SOAPONLY", lines: [line], subtotalCents: 2000, email: "a@hycare.test" })).rejects.toMatchObject({ code: "COUPON_INVALID" });

    const user = await actor("CUSTOMER");
    await setCartCoupon({ userId: user.id, code: "CARE10" });
    await expect(setCartCoupon({ userId: user.id, code: "OTHER" })).rejects.toMatchObject({ code: "COUPON_STACK" });
  });
});

describe("checkout, stock, and access", () => {
  it("places a cash order once, decrements stock once, and hides it from another customer", async () => {
    const { variant, method } = await catalog(2);
    const cart = await cartWith(variant.id, 1);
    const key = "cod-idem-key-01";
    const first = await placeOrder(checkoutInput(cart.id, method.id, key));
    expect(first.replayed).toBe(false);
    expect(first.emailDelivered).toBe(false);
    expect(first.order.status).toBe("CONFIRMED");
    expect(first.order.totalCents).toBe(2500);
    const payment = await prisma.payment.findFirst({ where: { orderId: first.order.id } });
    expect(payment?.provider).toBe("COD");
    expect(payment?.status).toBe("PENDING");
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(1);

    const second = await placeOrder(checkoutInput(cart.id, method.id, key));
    expect(second.replayed).toBe(true);
    expect(second.order.id).toBe(first.order.id);
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(1);
    expect(await prisma.order.count()).toBe(1);

    const owner = await actor("CUSTOMER");
    const stranger = await actor("CUSTOMER");
    await prisma.order.update({ where: { id: first.order.id }, data: { userId: owner.id } });
    expect(await getOrderForViewer(first.order.number, { userId: stranger.id })).toBeNull();
    expect((await getOrderForViewer(first.order.number, { userId: owner.id }))?.id).toBe(first.order.id);
    expect((await getOrderForViewer(first.order.number, { token: first.order.accessToken }))?.id).toBe(first.order.id);
    expect((await prisma.payment.findFirst({ where: { orderId: first.order.id } }))?.status).toBe("PENDING");

    const again = await cartWith(variant.id, 2);
    await expect(placeOrder(checkoutInput(again.id, method.id, "cod-idem-key-02"))).rejects.toMatchObject({ code: "OUT_OF_STOCK" });
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(1);

    const staff = await actor("OWNER");
    await updateOrderStatus(staff, first.order.id, "CANCELLED");
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(2);
  });

  it("does not capture Areeba and does not mark a card order paid from the success page", async () => {
    const { variant, method, product } = await catalog(3);
    const cart = await cartWith(variant.id, 1);
    await expect(placeOrder(checkoutInput(cart.id, method.id, "areeba-key-0001", "AREEBA"))).rejects.toMatchObject({
      code: "AREEBA_NOT_CONFIGURED",
    });
    expect(await prisma.order.count()).toBe(0);
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(3);

    const order = await prisma.order.create({
      data: {
        number: "HC-9001",
        email: "guest@hycare.test",
        contactName: "Hassan Khalil",
        status: "PENDING",
        subtotalCents: 2000,
        discountCents: 0,
        shippingCents: 500,
        taxCents: 0,
        totalCents: 2500,
        shippingName: "Courier",
        shippingEstimate: "1–3 days",
        idempotencyKey: "stripe-order-key",
        accessToken: "guest-access-token-9001",
        stockCommitted: false,
        items: {
          create: {
            productId: product.id,
            variantId: variant.id,
            name: product.name,
            sku: variant.sku,
            variantTitle: "Standard",
            unitPriceCents: 2000,
            quantity: 1,
            lineTotalCents: 2000,
          },
        },
        payments: {
          create: {
            provider: "STRIPE",
            status: "PENDING",
            amountCents: 2500,
            currency: "USD",
            idempotencyKey: "pay_stripe_order_key",
          },
        },
      },
    });
    await prisma.stockReservation.create({
      data: { variantId: variant.id, orderId: order.id, quantity: 1, expiresAt: new Date(Date.now() + 60_000) },
    });

    const viewed = await getOrderForViewer(order.number, { token: order.accessToken });
    expect(viewed?.payments[0].status).toBe("PENDING");
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(3);

    process.env.STRIPE_SECRET_KEY = "sk_test_hycare_sandbox_only";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_hycare_test_secret";
    const payload = JSON.stringify({
      id: "evt_hycare_paid_1",
      object: "event",
      api_version: "2024-06-20",
      created: Math.floor(Date.now() / 1000),
      type: "checkout.session.completed",
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      data: {
        object: {
          id: "cs_test_hycare",
          object: "checkout.session",
          payment_status: "paid",
          metadata: { orderId: order.id },
          client_reference_id: order.id,
        },
      },
    });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    expect(() => constructStripeEvent(payload, "t=1,v1=bad")).toThrow(/signature/i);
    const event = constructStripeEvent(payload, signature);
    await applyStripeEvent(event);
    await applyStripeEvent(event);
    expect((await prisma.variant.findUnique({ where: { id: variant.id } }))?.stock).toBe(2);
    expect((await prisma.payment.findFirst({ where: { orderId: order.id } }))?.status).toBe("PAID");
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe("CONFIRMED");
    expect(await prisma.paymentEvent.count({ where: { eventId: "evt_hycare_paid_1" } })).toBe(1);
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
});

describe("admin access and dashboard queries", () => {
  it("lets catalog staff edit products and refuses order changes from the wrong role", async () => {
    const customer = await actor("CUSTOMER");
    const inventory = await actor("INVENTORY_MANAGER");
    const category = await prisma.category.create({ data: { name: "Home", slug: "home" } });
    await expect(
      createProduct(customer, {
        name: "Nope",
        description: "Nope",
        categoryId: category.id,
        priceCents: 100,
        variants: [{ sku: "NOPE", stock: 1 }],
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });

    const created = await createProduct(inventory, {
      name: "Linen spray",
      description: "For the room.",
      categoryId: category.id,
      priceCents: 1800,
      published: true,
      variants: [{ sku: "SPRAY", stock: 3 }],
    });
    expect(created.published).toBe(true);

    const order = await prisma.order.create({
      data: {
        number: "HC-1",
        email: customer.email,
        contactName: "Customer",
        status: "CONFIRMED",
        subtotalCents: 1800,
        discountCents: 0,
        shippingCents: 0,
        taxCents: 0,
        totalCents: 1800,
        shippingName: "Courier",
        shippingEstimate: "2 days",
        idempotencyKey: "admin-order-key",
        accessToken: "admin-order-token",
        stockCommitted: true,
        items: {
          create: {
            productId: created.id,
            variantId: created.variants[0].id,
            name: created.name,
            sku: "SPRAY",
            variantTitle: "Standard",
            unitPriceCents: 1800,
            quantity: 1,
            lineTotalCents: 1800,
          },
        },
      },
    });
    await expect(updateOrderStatus(inventory, order.id, "PROCESSING")).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.status).toBe("CONFIRMED");

    const snapshot = await dashboardSnapshot();
    expect(snapshot.all.orders).toBe(0);
    expect(snapshot.all.revenueCents).toBe(0);
    expect(snapshot.all.aovCents).toBe(0);
    expect(await salesSeries("day")).toEqual([]);
  });

  it("counts rate-limit attempts", async () => {
    const first = await consumeRateLimit("login:test", 2, 60_000);
    const second = await consumeRateLimit("login:test", 2, 60_000);
    const third = await consumeRateLimit("login:test", 2, 60_000);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(third.ok).toBe(false);
    const previous = process.env.RATE_LIMIT_DISABLED;
    delete process.env.RATE_LIMIT_DISABLED;
    await expect(rateLimit("checkout:test", 1, 60_000)).resolves.toBeUndefined();
    await expect(rateLimit("checkout:test", 1, 60_000)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    process.env.RATE_LIMIT_DISABLED = previous;
  });
});
