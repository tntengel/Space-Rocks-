-- Home Planet TV — creator support: one-time tips, recurring Superfan
-- subscriptions (creator sets their own price), and platform-level
-- donations from the nav bar. Fulfills the "Tips and Superfan
-- subscriptions, priced however you choose" promise on the Mission page.

alter table public.channels
  add column superfan_price_cents integer check (superfan_price_cents is null or superfan_price_cents > 0);

-- ---------------------------------------------------------------------
-- One-time tips to a channel
-- ---------------------------------------------------------------------

create table public.tips (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  from_user_id uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  message text,
  created_at timestamptz not null default now()
);

create index tips_channel_id_idx on public.tips (channel_id, created_at desc);

alter table public.tips enable row level security;

create policy "tips are publicly readable" on public.tips
  for select using (true);

create policy "users can tip as themselves" on public.tips
  for insert with check (auth.uid() = from_user_id);

-- ---------------------------------------------------------------------
-- Recurring Superfan subscriptions to a channel. price_cents_at_signup
-- is a snapshot, not a live read of channels.superfan_price_cents, so a
-- later price change by the creator doesn't retroactively change what
-- existing Superfans are already paying.
-- ---------------------------------------------------------------------

create table public.superfan_subscriptions (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  price_cents_at_signup integer not null,
  status text not null default 'active' check (status in ('active', 'canceled')),
  created_at timestamptz not null default now(),
  canceled_at timestamptz
);

-- One active subscription per (channel, user) at a time; re-subscribing
-- after canceling is a new row, so history is preserved.
create unique index superfan_subscriptions_active_unique
  on public.superfan_subscriptions (channel_id, user_id)
  where status = 'active';

create index superfan_subscriptions_channel_id_idx on public.superfan_subscriptions (channel_id) where status = 'active';

-- Always snapshot the channel's *current* price server-side — never
-- trust a client-submitted price_cents_at_signup — and reject signing
-- up for Superfan on a channel that hasn't set a price (feature off).
create or replace function public.set_superfan_signup_price()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price integer;
begin
  select superfan_price_cents into v_price from public.channels where id = new.channel_id;
  if v_price is null then
    raise exception 'This channel has not enabled Superfan subscriptions.';
  end if;
  new.price_cents_at_signup := v_price;
  return new;
end;
$$;

create trigger before_superfan_subscription_insert
  before insert on public.superfan_subscriptions
  for each row execute function public.set_superfan_signup_price();

alter table public.superfan_subscriptions enable row level security;

create policy "participants can read a superfan subscription" on public.superfan_subscriptions
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select owner_user_id from public.channels where id = channel_id)
  );

create policy "users can become a superfan as themselves" on public.superfan_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "users can cancel their own superfan subscription" on public.superfan_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Platform-level donations (the nav bar "Support Home Planet TV"
-- button) — not tied to any channel, so kept private to the donor
-- rather than shown on a public leaderboard.
-- ---------------------------------------------------------------------

create table public.platform_donations (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

alter table public.platform_donations enable row level security;

create policy "users can read their own platform donations" on public.platform_donations
  for select using (auth.uid() = from_user_id);

create policy "users can donate as themselves" on public.platform_donations
  for insert with check (auth.uid() = from_user_id);
