# HyCare setup

HyCare is a custom store for home and personal care. Catalog, orders, stock, coupons, and staff roles live in PostgreSQL. The shop is not a Shopify theme.

## Install

Requirements: Node.js 20 or newer, PostgreSQL 16.

```bash
npm install
cp .env.example .env
```

Edit `.env`. Set `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ random characters), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `OWNER_EMAIL`, and `OWNER_PASSWORD`. Do not commit `.env`.

Create the database, then apply migrations:

```bash
npx prisma migrate deploy
```

`npm run db:migrate` is the development command (`prisma migrate dev`) and needs permission to create a shadow database.

## Sample catalog

```bash
npm run db:seed
```

The seed inserts a small **sample catalog**: six categories, six products, a hero image, two Lebanon shipping zones, and a `CARE10` coupon. Those rows are real and can be edited or deleted in `/admin`. The seed does **not** insert orders, payments, reviews, or revenue. If any product already exists, the seed skips.

Sample photographs in `prisma/sample-images` are unbranded stand-ins. Replace them with the shop’s own photos. They are stored through the storage interface, and the homepage hero URL is saved on `SiteContent`, not hardcoded in the page.

## Owner account

```bash
npm run bootstrap:owner
```

This creates the user in `OWNER_EMAIL` with `OWNER_PASSWORD`, marks the email verified, and sets the role to `OWNER`. If that user already exists, the password is not changed. Sign in at `/login`, then open `/admin`.

## Run

```bash
npm run dev
```

Production:

```bash
npm run build
npm start
```

Tests use a separate database named `hycare_test` (see `vitest.config.ts`):

```bash
npm test
```

## Email

If `RESEND_API_KEY` is set, mail goes through Resend. Otherwise, if `SMTP_HOST` is set, mail goes through SMTP. If neither is set, each message is stored in `EmailMessage` with status `NOT_SENT`. The check-email page shows that link only in that case. The app does not claim the message was delivered.

## Images

Development stores uploads on local disk (`LOCAL_STORAGE_DIR`, default `storage/uploads`) and serves them at `/media/...`. Production should set the `S3_*` variables. Uploads are checked for JPEG, PNG, or WebP magic bytes, limited to 5 MB, and re-encoded.

## Payments

Cash on delivery works without extra accounts. The order is confirmed when it is placed, stock is reduced then, and the payment stays pending until staff mark the cash collected.

Stripe is optional and test-mode only. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and point Stripe at `POST /api/webhooks/stripe`. An order is marked paid only after the signed webhook. Opening the success URL does not mark it paid. Stripe Checkout does not settle to Lebanese merchants.

Areeba is the likely Lebanese card-acquiring option. The provider interface throws `AREEBA_NOT_CONFIGURED` and does not capture a payment. Do not put card numbers in this app.

## Backups

```bash
pg_dump "$DATABASE_URL" --format=custom --file=hycare.dump
pg_restore --dbname="$DATABASE_URL" --clean --if-exists hycare.dump
```

Keep dumps off the app server. Restoring replaces the current database.

## What is unfinished

- No production host is configured. GitHub Actions runs the Vitest suite against PostgreSQL.
- Card checkout is not a live Lebanese acquiring integration. Areeba does not charge anyone.
- Stripe, when configured, is a sandbox and does not pay out to a Lebanese merchant account.
- Email is not sent until Resend or SMTP is configured.
- Production images need S3-compatible settings. Local disk is for development.
- Guest wishlist items live in this browser until sign-in. They are not a server cart.
- Account closure records a request. It does not delete the user.
