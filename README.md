# Parking Sharing App

A building-exclusive web app that lets residents share and book parking spots effortlessly. Residents offer their spots when unused, others browse availability and book — all verified by phone to keep it building-only.

Built with **Next.js**, **Supabase** (Postgres + Auth + RLS), and **Tailwind CSS**.

## Features

- Phone-based authentication with building whitelist
- Offer parking spots on a weekly calendar grid
- Browse and book available spots by time slot
- View your bookings and your offered spots
- Row-level security and DB-level invariants (no self-booking)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/sharifshayma/parkingapp.git
cd parkingapp
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host (defaults to `https://app.posthog.com`) |
| `RESEND_API_KEY` | Resend API key — sends the approval email when a user is approved (optional; email is skipped if unset) |
| `EMAIL_FROM` | From address for approval email, e.g. `Parking App <noreply@yourdomain.com>` — required when `RESEND_API_KEY` is set |
| `NEXT_PUBLIC_APP_URL` | Public app URL used inside the approval email (defaults to `https://parkingapp.shayma.me`) |

### 3. Apply database migrations

Migrations live in `supabase/migrations/`. Apply them with the Supabase CLI:

```bash
supabase db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (app)/        # Authenticated app routes: home, offer, book, my-bookings, my-parking, profile
    (auth)/       # Login and profile completion
    api/          # Route handlers
  components/     # UI primitives, calendar grids, layout
  hooks/          # Calendar drag selection, offer fetching
  lib/
    supabase/     # Browser / server / admin / middleware clients
    actions/      # Server actions (auth)
    types/        # Domain types
    utils/        # Phone + time helpers
supabase/
  migrations/     # Schema, RLS policies, functions, seed data
```

## Deployment

Deployed on Vercel. Before first deploy, add all env vars listed above to the Vercel project settings (Production, Preview, Development).

## Docs

- [`PRD.md`](PRD.md) — Product requirements and design spec
