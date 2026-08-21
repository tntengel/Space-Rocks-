# Home Planet TV — Build Brief

This is the handoff spec for turning the Home Planet TV prototype into a real,
deployed app. The prototype (`src/Platform.jsx`) defines the full UI and
feature set — the job is to replace its fake in-memory data with a real
backend and deploy it.

## Stack

- **Database + Auth + Image storage:** Supabase (Postgres, built-in auth, file storage)
- **Video upload/storage/streaming:** Cloudflare Stream
- **Live streaming (multi-viewer):** not chosen yet — the prototype's "Go Live"
  is a local-camera-only demo; real live streaming needs a dedicated ingest/
  playback service (e.g. Cloudflare Stream Live, Mux)
- **Frontend hosting:** Vercel
- **CSAM detection:** Microsoft PhotoDNA (pending application approval) — wire in once approved
- **Copyright:** DMCA agent info to be added to a public footer/page once registered
- **Payments (creator plans, Verified Critic subscription):** not chosen yet —
  needs a processor (e.g. Stripe) before "Pricing" is anything but a demo

## Data model

Implemented so far, in `supabase/migrations/0001_init_schema.sql`:

**users** — id, name, handle (unique), email, birthdate, is_adult (bool), channel_id, created_at
**channels** — id, owner_user_id, name, handle, tagline, avatar_url, banner_url, followers_count, created_at
**videos** — id, channel_id, title, video_url, is_adult (bool), moderation_status (pending/approved/rejected), views, likes, created_at
**comments** — id, video_id, author_user_id, text, created_at
**likes** — id, video_id, user_id (unique per video+user)
**follows** — id, follower_user_id, channel_id (unique per pair)
**notifications** — id, user_id, text, read (bool), created_at

Not yet in the schema — the prototype's newer features still only exist as
local mock state and will need their own tables/migration:

- **channels.plan** (free/creator/pro) — gates upload length/quality/library
  size in `UploadFlow`
- **users.is_critic** — Verified Critic badge/status
- **video ratings** as their own table (video_ratings: video_id, user_id,
  rating, is_critic_rating) rather than folded into `videos.likes` — the
  prototype now has 1–5 heart ratings plus a separate critic-only average,
  which needs per-user rows to compute correctly (the current `likes` table
  doesn't carry a rating value)
- **video technical metadata**: duration_sec, filter, trim_start, trim_end,
  quality
- **posts** (channel updates + polls) and **poll_votes** (one vote per user
  per poll)
- **conversations** / **messages** (direct messages between a viewer and a
  channel)
- **support_requests** (support/report/appeal tickets + status)

## Feature checklist

- [x] Sign-up: name, email, birthdate (13+ required, enforced server-side),
      age-gated adult content — passwordless magic-link auth (`src/lib/auth.js`)
- [x] Sign-out
- [ ] Channel creation, avatar/banner upload (DB row created on sign-up;
      avatar/banner still upload to a local object URL, not Supabase Storage)
- [ ] Video upload → Cloudflare Stream → moderation check → publish (trim/
      filter/quality UI exists; nothing uploads anywhere real yet)
- [ ] Feed (For You / Following tabs), search — UI wired, reads mock data
- [ ] Channel pages, Follow/Following, Message — UI wired, reads mock data
- [ ] Watch page: real video playback, 1–5 heart rating + Verified Critic
      score, comments
- [ ] Notifications (bell + panel) — schema/triggers ready from the earlier
      pass, UI still reads local mock notifications for the new features
- [ ] Creator analytics (views/ratings/comments/followers + bar chart)
- [ ] Community posts + polls
- [ ] Direct messages
- [ ] Live streaming — currently a local-camera-only demo, no viewers
- [ ] Creator plans (Free/Creator/Pro) + billing
- [ ] Verified Critic subscription + billing
- [ ] Help center: support / report / appeal tickets
- [ ] Account settings: data export (works, client-side only), account
      deletion (currently local-only — see note below)
- [x] Guidelines page (static content)
- [x] Mission page (static content)

## Build order

1. **Supabase project**: create a project, run
   `supabase/migrations/0001_init_schema.sql` (schema, RLS, triggers, 13+
   enforcement). Copy `.env.example` to `.env` with the project URL + anon key.
2. **Phase-2 schema migration** for the tables listed above (plans, critic
   status, ratings, posts/polls, messages, support requests, video metadata),
   with matching RLS policies.
3. **Cloudflare Stream integration**: replace `UploadFlow`'s
   `URL.createObjectURL` with a real upload; store the returned playback URL
   and duration in `videos`.
4. **Moderation step**: PhotoDNA check between upload and publish (`videos`
   stays `moderation_status = 'pending'` until it passes).
5. **Payments**: pick a processor for creator plans and the Verified Critic
   subscription before treating either as more than a demo.
6. **Live streaming**: pick a real ingest/playback service if multi-viewer
   live is a launch requirement — the current demo only shows the streamer
   their own camera.
7. **Wire the rest of the UI to real data**: swap `Platform.jsx`'s remaining
   mock state for Supabase queries — component structure/styling carries
   over directly.
8. **Account deletion**: needs a server-side function (e.g. a Supabase Edge
   Function with the service role key) to actually delete the `auth.users`
   row — the anon key used by the browser client can't do this safely.
9. **Deploy to Vercel**, connect a domain, set env vars.
10. **End-to-end test** the full flow before inviting real users.

## What this pass did

- Reviewed the expanded prototype (renamed World Home Video → Home Planet TV,
  with polls, DMs, live-demo, ratings/critic system, paid plans, help center,
  account settings) for bugs and fixed:
  - **Camera left running after leaving the live-stream page.** `GoLive`'s
    cleanup referenced the `stream` state variable from its mount-time
    closure, which was still `null` at that point — so on unmount the camera/
    mic track was never actually stopped unless the user clicked "End
    stream" first. Fixed with a ref so cleanup always stops the real stream.
  - **No way to sign in when signed out.** The nav bar rendered nothing in
    the signed-out state (no "Start your channel" button), so a new visitor
    had no way to reach sign-up from the nav. Restored the button.
  - Minor: revoke the previous upload's object URL when a new file is
    picked, instead of leaking one per selection.
- Re-connected real Supabase passwordless sign-up/sign-in (this had reverted
  to the old fake in-browser signup in the pasted version) and added sign-out
  to the nav.
- Since the feed/channels are still local mock state, a freshly-created real
  account now gets a stub channel entry added to that local array so the
  dashboard/upload flow has somewhere to write to — this goes away once step
  7 above wires channels to real Supabase queries.

## What's still mocked

Everything except sign-up/sign-in/sign-out: the feed, channel pages, posts/
polls, direct messages, live streaming, ratings/critic scores, creator plans,
support requests, and uploads all still read/write the local `seedChannels`
mock array and the local `user` object's `conversations`/`supportRequests`/
`isCritic` fields. None of that survives a page reload yet. Cloudflare
Stream, PhotoDNA, a payments processor, a live-streaming service, and Vercel
deployment all need live accounts/credentials this environment doesn't have.
