# DOMNI

Event infrastructure for campuses — ticketing, QR check-in, voting &
nominations, and organizer dashboards.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
Supabase (Auth, Postgres, Storage, Realtime) · Prisma

## What's in this delivery

**Phase 1 — Foundation**
- Project scaffold (`package.json`, `tsconfig.json`, `next.config.mjs`, Tailwind/PostCSS config)
- Supabase clients: browser (`lib/supabase/client.ts`), server (`lib/supabase/server.ts`),
  and middleware session refresh + route protection (`middleware.ts`)
- Full Prisma schema (`prisma/schema.prisma`) covering users, events, sections,
  ticket types, tickets, voting campaigns, nominees, votes, transactions
- Starter Row Level Security policies (`prisma/rls-policies.sql`)
- Complete design system: navy/purple palette, Geist/Inter/JetBrains Mono
  type system, and the ticket-stub signature component (`components/ui/ticket-card.tsx`)
- Full landing page: Navbar, Hero, Trusted By, Features, How It Works,
  Event Showcase, Voting Showcase, Pricing, Testimonials, FAQ, Footer

**Phase 2 — Auth & event creation**
- Sign up (attendee/organizer role toggle), login, forgot password, and
  reset password pages — all Supabase Auth, all on a shared split-screen
  layout (`app/(auth)/`)
- Magic link + OAuth-ready sign-in (`components/auth/OAuthButtons.tsx`) —
  just enable a provider in the Supabase dashboard, no code changes needed
- `app/auth/callback/route.ts` exchanges the magic-link/OAuth code for a session
- Organizer event builder (`/organizer/events/new`) with the dynamic
  ticket-type UI: a creatable select (`components/ui/creatable-select.tsx`)
  that suggests presets (VIP, Early Bird…) but always accepts a typed
  custom name, nested inside per-section editors so one event can hold
  multiple sections, each with its own ticket types
- Cover image upload to Supabase Storage (`lib/supabase/storage.ts`)
- `createEvent` server action persists the whole event — sections and
  ticket types — in a single Prisma transaction

## Getting started

```bash
npm install
cp .env.example .env
```

1. Create a Supabase project. Copy the project URL, anon key, and service
   role key into `.env`.
2. Copy your Postgres connection strings (pooled + direct) into `DATABASE_URL`
   and `DIRECT_URL`.
3. **Stop `npm run dev` first** (on Windows it locks Prisma's engine file and
   `prisma generate` fails with `EPERM`), then push the schema, generate the
   client and seed the ticket designs:
   ```bash
   npx prisma db push
   npx prisma generate
   node scripts/seed-templates.js
   ```
   Every time `schema.prisma` changes, repeat this and restart the dev server —
   a stale client is the usual cause of "column does not exist" errors.

   **Admin panel:** add your email to `.env` and sign in, then open `/admin`:
   ```
   ADMIN_EMAILS=you@example.com
   ```
   (Comma-separate several. You can also promote people from the panel.)

   **Payouts:** organizers connect a bank account in Settings → Payout account.
   That creates a Paystack subaccount, and every ticket/vote payment is split
   at checkout — the organizer's share settles to their bank, DOMNI's fee to
   yours. Set the webhook URL in Paystack to `https://<your-domain>/api/paystack/webhook`.
4. Run the RLS + storage policies in the Supabase SQL editor: paste in
   `prisma/rls-policies.sql` (this also creates the public `event-covers`
   storage bucket).
5. In Supabase Dashboard → Authentication → URL Configuration, set your
   site URL and add `/auth/callback` as a redirect URL.
6. Start the dev server:
   ```bash
   npm run dev
   ```

Try it: `/signup` → confirm email → `/login` → `/organizer/events/new` to
create an event with multiple sections and ticket types.

## Roadmap — what's next

**Phase 3 — Voting system**
- Campaign + nominee creation UI with image upload
- Realtime leaderboard via Supabase Realtime subscriptions
- Guest vote checkout flow

**Phase 4 — Dashboard & admin**
- Organizer dashboard: revenue, tickets sold, recent transactions, upcoming
  events, voting stats, charts
- Admin panel: manage users, events, payouts, featured events
- QR check-in scanner page

**Phase 5 — Payments & ticket issuance**
- Flutterwave checkout for ticket purchases and vote purchases
- QR code generation on successful payment, stored in Supabase Storage
- Ticket status transitions (valid → checked-in) at the door

Say the word when you want Phase 3.
