-- Home Planet TV — phase 2 schema
-- Adds everything the expanded prototype needs beyond migration 0001:
-- creator plan tiers, Verified Critic status, per-user video ratings
-- (replacing the old flat likes model), video technical metadata,
-- community posts/polls, direct messages, and support requests.

-- ---------------------------------------------------------------------
-- users / channels / videos: new columns
-- ---------------------------------------------------------------------

alter table public.users
  add column is_critic boolean not null default false;

alter table public.channels
  add column plan text not null default 'free' check (plan in ('free', 'creator', 'pro'));

alter table public.videos
  add column duration_sec integer,
  add column raw_duration_sec numeric,
  add column trim_start numeric not null default 0,
  add column trim_end numeric,
  add column filter text not null default 'none'
    check (filter in ('none', 'bw', 'warm', 'cool', 'vintage', 'contrast')),
  add column quality text not null default '720p'
    check (quality in ('480p', '720p', '1080p', '4K')),
  add column avg_rating numeric not null default 0,
  add column rating_count integer not null default 0,
  add column critic_avg_rating numeric not null default 0,
  add column critic_rating_count integer not null default 0;

-- ---------------------------------------------------------------------
-- Ratings replace the old flat "likes" model (1-5 hearts, with a
-- separate rollup for Verified Critics' ratings).
-- ---------------------------------------------------------------------

drop trigger if exists on_like_change on public.likes;
drop function if exists public.handle_like_change();
drop table if exists public.likes;
alter table public.videos drop column if exists likes;

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  is_critic_rating boolean not null default false,
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);

create index ratings_video_id_idx on public.ratings (video_id);

-- is_critic_rating always reflects the rater's *current* Verified
-- Critic status at the time they rate — never trust the client's copy
-- of that flag.
create or replace function public.set_rating_critic_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select is_critic into new.is_critic_rating from public.users where id = new.user_id;
  return new;
end;
$$;

create trigger before_rating_write
  before insert or update on public.ratings
  for each row execute function public.set_rating_critic_flag();

-- Keep videos.avg_rating/rating_count/critic_avg_rating/critic_rating_count
-- in sync by recomputing from public.ratings on every change (simple and
-- drift-free; a video's rating count is small enough that a full
-- recompute per write is cheap).
create or replace function public.handle_rating_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_video_id uuid := coalesce(new.video_id, old.video_id);
begin
  update public.videos v
  set
    avg_rating = coalesce((select avg(rating) from public.ratings where video_id = v_video_id), 0),
    rating_count = (select count(*) from public.ratings where video_id = v_video_id),
    critic_avg_rating = coalesce((select avg(rating) from public.ratings where video_id = v_video_id and is_critic_rating), 0),
    critic_rating_count = (select count(*) from public.ratings where video_id = v_video_id and is_critic_rating)
  where v.id = v_video_id;
  return coalesce(new, old);
end;
$$;

create trigger on_rating_change
  after insert or update or delete on public.ratings
  for each row execute function public.handle_rating_change();

alter table public.ratings enable row level security;

create policy "ratings are publicly readable" on public.ratings
  for select using (true);

create policy "users can rate as themselves" on public.ratings
  for insert with check (auth.uid() = user_id);

create policy "users can change their own rating" on public.ratings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can remove their own rating" on public.ratings
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Community posts (updates + polls) and poll votes
-- ---------------------------------------------------------------------

create table public.channel_posts (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  type text not null check (type in ('text', 'poll')),
  text text,
  question text,
  options jsonb,
  created_at timestamptz not null default now(),
  check (
    (type = 'text' and text is not null and question is null and options is null)
    or
    (type = 'poll' and question is not null and options is not null and text is null)
  )
);

create index channel_posts_channel_id_idx on public.channel_posts (channel_id);

create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.channel_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  option_index integer not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

-- Bump options[option_index].votes on the parent post. Votes can't be
-- changed once cast (the prototype's UX never re-enables voting after
-- voted !== null), so insert-only is enough.
create or replace function public.handle_poll_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.channel_posts
  set options = jsonb_set(
    options,
    array[new.option_index::text, 'votes'],
    to_jsonb(coalesce((options -> new.option_index ->> 'votes')::int, 0) + 1)
  )
  where id = new.post_id;
  return new;
end;
$$;

create trigger on_poll_vote
  after insert on public.poll_votes
  for each row execute function public.handle_poll_vote();

alter table public.channel_posts enable row level security;
alter table public.poll_votes enable row level security;

create policy "channel posts are publicly readable" on public.channel_posts
  for select using (true);

create policy "owner can post to own channel" on public.channel_posts
  for insert with check (
    exists (select 1 from public.channels c where c.id = channel_id and c.owner_user_id = auth.uid())
  );

create policy "users can read their own poll votes" on public.poll_votes
  for select using (auth.uid() = user_id);

create policy "users can vote as themselves" on public.poll_votes
  for insert with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Direct messages: one conversation per (viewer, channel) pair
-- ---------------------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (channel_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender text not null check (sender in ('user', 'channel')),
  text text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "participants can read their conversation" on public.conversations
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select owner_user_id from public.channels where id = channel_id)
  );

create policy "a viewer can start a conversation with a channel" on public.conversations
  for insert with check (auth.uid() = user_id);

create policy "participants can read their messages" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (auth.uid() = c.user_id or auth.uid() = (select owner_user_id from public.channels where id = c.channel_id))
    )
  );

create policy "participants can send messages, correctly labeled" on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          (auth.uid() = c.user_id and sender = 'user')
          or (auth.uid() = (select owner_user_id from public.channels where id = c.channel_id) and sender = 'channel')
        )
    )
  );

-- ---------------------------------------------------------------------
-- Help Center: support / report / appeal requests
-- ---------------------------------------------------------------------

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('support', 'report', 'appeal')),
  subject text not null,
  details text not null,
  status text not null default 'Under review',
  created_at timestamptz not null default now()
);

create index support_requests_user_id_idx on public.support_requests (user_id);

alter table public.support_requests enable row level security;

create policy "users can read their own requests" on public.support_requests
  for select using (auth.uid() = user_id);

create policy "users can file requests as themselves" on public.support_requests
  for insert with check (auth.uid() = user_id);

-- No update policy for users: status changes (e.g. "Resolved") are a
-- moderation/support action, done via the service role, not by the
-- filer.
