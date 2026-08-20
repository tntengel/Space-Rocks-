# World Home Video

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

- `src/Platform.jsx` — the app: UI for the landing page, feed, channel pages,
  watch page, upload flow, dashboard, and guidelines.
- `src/lib/supabaseClient.js` — Supabase client, configured from env vars.
- `src/lib/auth.js` — passwordless (magic-link) sign-up/sign-in and profile
  loading.
- `supabase/migrations/` — SQL schema, RLS policies, and triggers.
