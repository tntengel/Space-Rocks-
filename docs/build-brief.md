# World Home Video — Build Brief

This is the handoff spec for turning the World Home Video prototype into a real,
deployed app. The prototype (`src/Platform.jsx`) already defines the full UI,
feature set, and visual design — the job now is to replace its fake in-memory data
with a real backend and deploy it.

## Stack

- **Database + Auth + Image storage:** Supabase (Postgres, built-in auth, file storage)
- **Video upload/storage/streaming:** Cloudflare Stream
- **Frontend hosting:** Vercel
- **CSAM detection:** Microsoft PhotoDNA (pending application approval) — wire in once approved
- **Copyright:** DMCA agent info to be added to a public footer/page once registered

## Data model

**users**
- id, name, handle (unique), email, birthdate, is_adult (bool), channel_id, created_at

**channels**
- id, owner_user_id, name, handle, tagline, avatar_url, banner_url, followers_count, created_at

**videos**
- id, channel_id, title, video_url (Cloudflare Stream asset), is_adult (bool),
  moderation_status (pending/approved/rejected), views, likes, created_at

**comments**
- id, video_id, author_user_id, text, created_at

**likes**
- id, video_id, user_id (unique per video+user)

**follows**
- id, follower_user_id, channel_id (unique per pair)

**notifications**
- id, user_id, text, read (bool), created_at

Implemented in `supabase/migrations/0001_init_schema.sql`, including RLS policies
and triggers (new-user provisioning + 13-and-older enforcement, follower/like
counters, and notification fan-out on follows/likes/comments).

## Feature checklist

- [x] Sign-up: name, email, birthdate (13+ required, enforced server-side),
      age-gated adult content — passwordless magic-link auth (`src/lib/auth.js`)
- [ ] Channel creation, avatar/banner upload (schema + DB row ready; avatar/banner
      still upload to a local object URL, not Supabase Storage)
- [ ] Video upload → Cloudflare Stream → moderation check → publish
- [ ] Feed (For You / Following tabs), search — UI wired, still reading mock data
- [ ] Channel pages, Follow/Following — UI wired, still reading mock data
- [ ] Watch page: real video playback with fullscreen, likes, comments
- [ ] Notifications (bell + panel) — schema/triggers ready, UI still reading mock data
- [ ] Creator analytics (views/likes/comments/followers stats + bar chart)
- [x] Guidelines page (static content)

## Build order

1. **Supabase project**: create a project, then run the SQL in
   `supabase/migrations/0001_init_schema.sql` (schema, RLS policies, triggers).
   Copy `.env.example` to `.env` and fill in the project URL + anon key.
2. **Cloudflare Stream integration**: replace the prototype's
   `URL.createObjectURL` upload in `UploadFlow` with a real upload to Cloudflare
   Stream; store the returned playback URL in `videos.video_url`.
3. **Moderation step**: insert a PhotoDNA check between upload and publish (video
   stays `moderation_status = 'pending'` until it passes — the RLS policy on
   `videos` already only exposes `approved` rows to non-owners).
4. **Wire the rest of the UI to real data**: swap `Platform.jsx`'s remaining
   `seedChannels` mock state for Supabase queries (feed, channel pages, likes,
   comments, follows, notifications) — component structure/styling carries over
   directly, only the data-fetching needs to change.
5. **Deploy to Vercel**, connect a domain, set the env vars from `.env.example`
   as Vercel project environment variables.
6. **End-to-end test** the full flow (sign up → upload → moderation → publish →
   watch → like/comment → follow → notification) before inviting real users.

## What this pass did

- Set up the Supabase schema, RLS policies, and triggers for the full data model.
- Replaced the prototype's mock sign-up with real Supabase passwordless
  (magic-link) authentication: `src/lib/auth.js` + the sign-up flow in
  `src/Platform.jsx`. The 13+ age check is enforced both client-side (fast
  feedback) and server-side (the `handle_new_user` trigger, which is the actual
  source of truth).
- Session restore on load and sign-out are wired up.

## What's still mocked

Everything downstream of "who is signed in" — the video feed, channel pages,
likes, comments, follows, notifications, and uploads — still reads/writes the
original in-memory `seedChannels` array in `src/Platform.jsx`. That's step 4
above. Cloudflare Stream, PhotoDNA, and Vercel deployment all need live
credentials/accounts that weren't available in this environment.
