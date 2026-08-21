# Home Planet TV — Build Brief

This is the handoff spec for turning the Home Planet TV prototype into a real,
deployed app. The prototype (`src/Platform.jsx`) defines the full UI and
feature set — the job is to replace its fake in-memory data with a real
backend and deploy it.

## Stack

- **Database + Auth + Image storage:** Supabase (Postgres, built-in auth, file storage)
- **Video upload/storage/streaming:** Cloudflare Stream, plus **Cloudflare
  Stream Live** for real multi-viewer live streaming — the prototype's "Go
  Live" only shows the broadcaster their own camera
- **Frontend hosting:** Vercel
- **CSAM detection:** Microsoft PhotoDNA (pending application approval) — wire
  into the upload pipeline once approved
- **General explicit-content detection:** a real content-classification API
  (e.g. AWS Rekognition, Google Vision SafeSearch, or Hive Moderation) to
  catch and reject sexually explicit uploads before publish — see the content
  policy decision below; this classifier enforces a ban, it doesn't gate an
  allowed category
- **Copyright:** DMCA agent info to be added to a public footer/page once registered
- **Payments** (creator plans, Verified Critic subscription, one-time tips,
  recurring Superfan subscriptions, platform donations): Stripe — one-time
  charges for tips/donations, Stripe Billing/subscriptions for Creator/Pro
  plans, Verified Critic, and Superfan. No adult-content-capable processor
  (CCBill/Segpay) is needed — see the content policy section below.

## Data model

Implemented in `supabase/migrations/`:

**0001_init_schema.sql** — core tables:
users, channels, videos, comments, follows, notifications, plus the sign-up
trigger (server-side 13+ enforcement) and notification fan-out.

**0002_creator_features.sql** — everything the expanded prototype added:
- `users.is_critic`, `channels.plan` (free/creator/pro)
- `videos`: duration_sec, raw_duration_sec, trim_start, trim_end, filter,
  quality, avg_rating, rating_count, critic_avg_rating, critic_rating_count
- **ratings** table (video_id, user_id, rating 1–5, is_critic_rating) —
  replaces the old flat `likes` table/column; a trigger keeps the aggregate
  columns on `videos` in sync, and `is_critic_rating` is always set
  server-side from the rater's current `users.is_critic`, never trusted from
  the client
- **channel_posts** (text updates or polls) + **poll_votes** (one vote per
  user per poll, enforced by a unique constraint; a trigger bumps the vote
  count stored in `channel_posts.options`)
- **conversations** (one per viewer/channel pair) + **messages** (sender:
  'user' | 'channel', RLS enforces a message can only be sent labeled as
  whichever side you actually are)
- **support_requests** (support/report/appeal tickets; users can read/file
  their own, status changes are a moderation action via the service role,
  not user-editable)

**0003_support_and_tips.sql** — creator support, separate from the plan
tiers (which is what a *creator* pays for hosting capacity — tips/Superfan
are what a *viewer* pays a creator directly):
- `channels.superfan_price_cents` — nullable; a creator sets their own
  monthly Superfan price, or leaves it unset to keep that feature off
- **tips** table (channel_id, from_user_id, amount_cents, message) —
  one-time, publicly readable (shown as a "supporters" list on the channel)
- **superfan_subscriptions** table — recurring; `price_cents_at_signup` is
  always snapshotted server-side from the channel's *current* price by a
  trigger (never trusted from the client, and doesn't retroactively change
  if the creator later changes their price); a partial unique index allows
  only one `active` subscription per (channel, user) at a time while
  preserving history across cancel/re-subscribe
- **platform_donations** table (from_user_id, amount_cents) — the nav bar's
  "Support Home Planet TV" button; not tied to a channel, kept private to
  the donor (no public leaderboard)

All new tables have RLS enabled with policies matching the existing pattern:
public read where the prototype shows the data to everyone (ratings, posts),
private to the participants where it shouldn't be (messages, support
requests, a user's own poll vote).

## Creator plan tiers (business logic, not just UI)

| Plan | Price | Max video length | Max quality | Max library |
|---|---|---|---|---|
| Free | $0 | 10 min | 720p | 60 min |
| Creator | $6.99/mo | 30 min | 1080p | 5 hrs |
| Pro Creator | $17.99/mo | Unlimited | 4K | Unlimited |

**Open implementation question:** in the prototype, a video's "length" for
plan-limit purposes is its *trimmed* length (in/out points), read from the
file via browser video metadata. Cloudflare Stream bills by *actual stored*
duration regardless of trim points. Decide explicitly whether the real
pipeline re-encodes trimmed clips to actually shorten what's stored, or
keeps "effective length" as a product/billing policy independent of real
storage cost — this affects both the Cloudflare Stream integration (step 2
below) and what `videos.duration_sec` actually means once it's driven by
real uploads instead of a client-side probe.

## Feature checklist

- [x] Sign-up: name, email, birthdate (13+ required, enforced server-side),
      age-gated adult content — passwordless magic-link auth (`src/lib/auth.js`)
- [x] Sign-out
- [ ] Channel creation, avatar/banner upload (DB row created on sign-up;
      avatar/banner still upload to a local object URL, not Supabase Storage)
- [ ] Video upload: trim, 6 visual filter presets, quality gated by plan,
      moderation check, publish (schema ready; nothing uploads anywhere real yet)
- [ ] Feed (For You / Following tabs), search — UI wired, reads mock data
- [ ] Channel pages: Follow/Following, Message, Report, public plan badge
- [ ] Watch page: real playback with trim/filter/speed applied, 5-heart
      rating + separate Verified Critic score, comments, Report
- [ ] Direct messages (conversation list + threads)
- [ ] Live streaming — currently a local-camera-only demo; needs Cloudflare
      Stream Live for real multi-viewer broadcast
- [ ] Community posts and polls per channel
- [x] Notifications backend (bell + panel; schema/triggers from 0001 cover
      follows/likes/comments — needs extending to cover ratings and DMs)
- [ ] Creator analytics (views/ratings/comments/followers + bar chart)
- [ ] Creator plan tiers (Free/Creator/Pro) with real upload-length enforcement
- [ ] Verified Critic subscription tier
- [ ] Creator support: one-time tips (nav-free, per channel), recurring
      Superfan subscriptions (creator sets their own price), and a nav-level
      "Support Home Planet TV" platform donation — schema ready in
      `0003_support_and_tips.sql`, UI wired, reads/writes mock data
- [ ] Help Center: Support/Report/Appeal with visible request history
- [ ] Account settings: data export (works, client-side only), account
      deletion (currently local-only — needs a server-side function, since
      the browser's anon key can't delete an `auth.users` row)
- [x] Mission page (static content)
- [x] Pricing page (static content, reachable without signing in)
- [x] Guidelines page (static content)

## Content policy — decided

**No sexually explicit content, at any age or tier.** The 18+ flag on a video
gates mature themes (strong language, intense/frightening content, adult
topics discussed in words) — not depictions of sex acts, which aren't allowed
on the platform at all. This keeps things simple for the soft launch: Stripe
alone covers payments (creator plans + the Verified Critic subscription),
there's no separate adult-content payment processor to integrate, and the
Guidelines/ToS/Privacy Policy can all be written against one clear line.

`src/Platform.jsx`'s `Guidelines()` component and the age-requirements copy
reflect this decision.

**Possible future addition, explicitly out of scope for v1:** a fourth,
higher-priced, real-ID-verified plan tier that allows explicit content. Two
things worth remembering if that comes back: (1) price alone is not
age verification — a real ID/age-verification vendor would be required
regardless of the tier's cost, since a growing number of US states now
require ID-based verification for adult content by law, and (2) it would
need the adult-content-capable payment processor (CCBill/Segpay) that this
v1 deliberately avoids. Architecturally this is a small addition when it
happens — `channels.plan` is a plain text column (`supabase/migrations/
0002_creator_features.sql`), so a fourth value is not a schema rewrite.

## Build order

1. **Supabase project**: create a project, run `0001_init_schema.sql`,
   `0002_creator_features.sql`, then `0003_support_and_tips.sql`, in order.
   Copy `.env.example` to `.env` with the project URL + anon key.
2. **Cloudflare Stream integration** (upload, storage, playback) — real trim
   enforcement and real quality tiers happen here, not just client-side.
   Resolve the trim/billing question above as part of this step.
3. **Cloudflare Stream Live**, if real live streaming is in scope for v1.
4. **Moderation pipeline**: PhotoDNA + a general explicit-content classifier,
   inserted between upload and publish (`videos.moderation_status` stays
   `pending` until both pass; the classifier's job is to catch and reject
   sexually explicit uploads, per the content policy above).
5. **Wire the rest of the UI to real data**: swap `Platform.jsx`'s remaining
   mock state (feed, posts, messages, ratings UI, plan changes, support
   requests) for Supabase queries — component structure/styling carries over
   directly.
6. **Payments**: integrate Stripe for plan tiers, the Verified Critic
   subscription, one-time tips, Superfan subscriptions, and platform
   donations.
7. **Account deletion**: a Supabase Edge Function with the service role key,
   since the anon key the browser uses can't delete an `auth.users` row.
8. **Deploy to Vercel**, connect a domain, set env vars.
9. **End-to-end test** the full flow before any soft launch.

## What's still mocked

Sign-up/sign-in/sign-out are real. Everything else — feed, channels, posts/
polls, messages, live streaming, ratings/critic scores, creator plans, tips/
Superfan/platform donations, support requests, and uploads — still
reads/writes local mock state in `src/Platform.jsx` and doesn't survive a
page reload. The schema above is ready for all of it; wiring the UI to it is
build-order step 5.
