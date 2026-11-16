# Jazzar

Internal phone app for the Jazzar rental fleet. The owner signs in and, for each car and each month, sees:

1. How many days it was rented
2. How much rental revenue it earned
3. How much was spent on maintenance and other expenses
4. How much profit is left after those expenses

Amounts are in USD. The same screens run on iPhone and Android through Expo.

Tabs: Dashboard, Cars, Rentals. Quick actions: Add rental and Add expense.

## Reporting rules

These are calculated in the app, not stored as totals:

- Rental revenue = daily rate × billed days that fall in the selected month. A rental that crosses months is split between those months.
- Billed days are calendar days. The pickup day is included. The return day is excluded. Pickup June 1 and return June 6 is 5 days. A same-day rental (pickup and return on the same date) is 1 day.
- Cash collected = payments whose payment date is in the selected month. Cash follows the payment date, not the rental span.
- Total expenses = that car's expenses dated in the selected month.
- Profit = rental revenue − total expenses. A month with expenses and no rentals shows a negative profit.
- Rented days = billed days of that car that fall in the selected month.
- Oil change, tires, repairs, and cleaning count as maintenance. Insurance and other expenses count in total expenses and profit, but not in maintenance.

The dashboard shows maintenance and total expenses as separate figures. Profit uses total expenses.

A new rental for a car cannot overlap billed days of another rental for that same car. The return day is free, so the next rental can start that day. The same dates on two different cars are allowed. The database rejects overlaps as well.

## Worked example

After you run the seed, open **June 2026** and look at **Toyota Corolla** (plate JAZ-1001):

- 5 rented days
- $150 rental revenue (5 × $30)
- $100 cash collected
- $40 total expenses (an oil change, so maintenance is also $40)
- $110 profit
- The rental shows a $50 balance ($150 charged − $100 paid)

On that Corolla rental, the sample also includes a before-pickup video and an after-return video for plate JAZ-1001.

Other sample rows:

- Honda Civic, pickup May 30 and return June 3, at $40/day: 2 days in May ($80) and 2 days in June ($80). The $160 payment is dated July 15, so May and June cash collected are $0 and July shows the cash.
- Kia Forte on June 15: a same-day rental, 1 billed day.
- Nissan Sentra in April 2026: insurance only, no rental, profit −$200.
- Hyundai Elantra in June 2026: $20 maintenance (cleaning) and $110 total expenses (cleaning plus insurance), profit −$110.
- Mazda 3 is rented across the same June dates as the Corolla. Different cars are allowed to overlap.
- Toyota Camry in August 2026: $180 charged, two payments totaling $130, $50 still due.

The dashboard opens on the current month. Use the arrows to move back to June 2026. The sign-in screen also has **View the June 2026 sample**, which shows these numbers from data bundled in the app. That sample is not saved to Supabase.

## Vehicle condition

Each rental has **Record Before Pickup** and **Record After Return**. Record in the app, or choose a video already on the phone. Damage notes are optional.

The app copies each video into its private document folder, and saves the rental and the notes on the phone. Closing the app does not remove them, and they play with no connection. The rental page shows both clips together, with the license plate, when the video was added, and one of these states:

- **Saved on Phone** — copied locally, not backed up yet
- **Uploading** — the backup is in progress
- **Backed Up** — the file is in the private `condition-videos` storage bucket
- **Upload Failed** — tap **Retry upload**. The phone copy stays either way

Oil change, tires, repairs, and cleaning are unchanged: they are maintenance. Insurance and other expenses still count in total expenses and profit, but not in maintenance.

When the phone is online again, pending rentals, notes, and videos sync. Video files are stored at `{owner id}/{rental id}/{video id}.mp4` and only the signed-in owner can read them. Sign in once while online. After that, airplane mode can still record a rental and both videos until the saved session expires.

## 1. Create a Supabase project

Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). Leave the Data API enabled for the `public` schema (Integrations → Data API). The app uses the public anon key with the signed-in owner's token. Row level security, not the key, keeps each owner's rows private.

## 2. Run the migration

In the Supabase SQL Editor, paste `supabase/migrations/20260601000000_init.sql` and run it.

If Postgres says `btree_gist` is missing, open Database → Extensions, enable **btree_gist**, and run the file again.

This creates `cars`, `rentals`, `payments`, and `expenses`, enables row level security on each, and adds policies so only `authenticated` rows with `owner_id = auth.uid()` can be read or written. Overlapping rentals for one car are rejected with an exclusion constraint.

## 3. Create the owner

Authentication → Users → Add user.

- Email: `owner@jazzar.app`, or another address. If you change it, change `owner_email` at the top of `supabase/seed.sql` to the same address.
- Password: choose one and keep it outside this repo.
- Auto Confirm: on.

If the project still requires email confirmation, confirm the user from the Users list before signing in.

## 4. Load the sample fleet

Paste `supabase/seed.sql` into the SQL Editor and run it once. It inserts eight cars plus the Corolla example and the extra cases above. If that owner already has cars, the seed stops and leaves them alone.

## 5. Connect the app

```sh
cp .env.example .env
```

From Project Settings → API, or the Connect panel for Expo:

- Project URL → `EXPO_PUBLIC_SUPABASE_URL`
- The public anon key. The dashboard may label it **anon** or **publishable**. Paste it into `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Do not put the `service_role` or secret key in `.env`. That key bypasses row level security. `.env` is gitignored. `.env.example` has the variable names and no real keys.

Restart Expo after changing `.env`.

## 6. Run it

Requires Node.js 20 or newer, and Expo Go on the phone. This project uses Expo SDK 57 so it opens in current Expo Go.

```sh
npm install
npx expo start
```

- iPhone or Android: install Expo Go and scan the QR code.
- Web: press `w` in the terminal.
- Android emulator: press `a` (Android Studio).
- iOS simulator: press `i` (macOS with Xcode).

Sign in with the owner email and password. The phone keeps a local copy and syncs it to Supabase, so the same fleet shows up on both phones once they are online. Condition videos play from the phone that saved them, and the other phone downloads the backup when it is online.

## Tests

```sh
npm test
npm run typecheck
```

`npm test` runs the calculation and validation tests: same-day = 1 day, pickup included and return excluded, overlapping rentals rejected, non-overlapping and different cars allowed, a rental split across two months with cash on the payment date, partial payments (total, paid, balance), a month of expenses with no rentals (negative profit), and the Corolla numbers above. It also checks that the SQL migrations keep row-level security, including condition videos and the private storage bucket. A separate test creates a rental and both condition videos with the network off, closes and reopens the local database, reads the video bytes back, then reconnects and checks that both files back up under that rental.

## Optional: Supabase CLI

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

`db push` applies `supabase/migrations`. Run `supabase/seed.sql` yourself in the SQL Editor afterward. Creating the auth user is still done in the dashboard.

## What you still do in Supabase

The repo does not contain a project URL, anon key, or password. You still:

1. Create the Supabase project.
2. Run the migration and the seed.
3. Create the owner user and choose a password.
4. Put the project URL and anon (or publishable) key in `.env`.
