# Home Planet TV

A video-sharing platform: a channel of your own, open to anyone, anywhere.

See [`docs/build-brief.md`](docs/build-brief.md) for the full data model, stack,
and build order.

## Stack

- **Frontend:** React + Vite
- **Database, Auth, Storage:** Supabase
- **Video:** Cloudflare Stream
- **Hosting:** Vercel

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

To set up the database, create a Supabase project and run the SQL in
`supabase/migrations/0001_init_schema.sql` against it (SQL Editor, or the
Supabase CLI).

## Project layout

- `src/Platform.jsx` — the app: landing page, feed, channel pages, watch page,
  upload flow (with trim/filters/quality/plan limits), creator dashboard,
  community posts/polls, direct messages, live streaming (demo), a Verified
  Critic rating system, paid creator plans, a help/report/appeal center,
  account settings (data export + deletion), and guidelines/mission pages.
- `src/lib/supabaseClient.js` — Supabase client, configured from env vars.
- `src/lib/auth.js` — passwordless (magic-link) sign-up/sign-in and profile
  loading.
- `supabase/migrations/` — SQL schema, RLS policies, and triggers.

Real sign-up/sign-in is wired to Supabase. Most other data (feed, channels,
posts, messages, ratings, plans, support requests) is still local mock state
— see `docs/build-brief.md` for what's wired vs. still mocked.
