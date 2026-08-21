-- Home Planet TV — initial schema
-- Tables, RLS policies, and triggers implementing the data model in
-- docs/build-brief.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  handle text not null unique,
  email text not null,
  birthdate date not null,
  is_adult boolean not null,
  channel_id uuid,
  created_at timestamptz not null default now()
);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.users (id) on delete cascade,
  name text not null,
  handle text not null unique,
  tagline text,
  avatar_url text,
  banner_url text,
  followers_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.users
  add constraint users_channel_id_fkey foreign key (channel_id)
    references public.channels (id) on delete set null;

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels (id) on delete cascade,
  title text not null,
  video_url text,
  is_adult boolean not null default false,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  views integer not null default 0,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  author_user_id uuid not null references public.users (id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_user_id uuid not null references public.users (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_user_id, channel_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  text text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index videos_channel_id_idx on public.videos (channel_id);
create index comments_video_id_idx on public.comments (video_id);
create index likes_video_id_idx on public.likes (video_id);
create index follows_channel_id_idx on public.follows (channel_id);
create index notifications_user_id_idx on public.notifications (user_id, read);

-- ---------------------------------------------------------------------
-- Sign-up: create the public.users + public.channels rows when someone
-- confirms a Supabase Auth account. Name, requested handle, and
-- birthdate travel in as auth user metadata (see src/lib/auth.js).
-- Age (13+) is enforced here, server-side, not just in the UI.
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_birthdate date;
  v_age integer;
  v_handle text;
  v_channel_id uuid;
begin
  v_name := trim(new.raw_user_meta_data ->> 'name');
  v_birthdate := (new.raw_user_meta_data ->> 'birthdate')::date;

  if v_name is null or v_name = '' then
    raise exception 'A channel name is required.';
  end if;
  if v_birthdate is null then
    raise exception 'A date of birth is required.';
  end if;

  v_age := extract(year from age(v_birthdate));
  if v_age < 13 then
    raise exception 'You must be 13 or older to create a channel here.';
  end if;

  v_handle := '@' || lower(regexp_replace(v_name, '\s+', '', 'g'));

  insert into public.users (id, name, handle, email, birthdate, is_adult)
  values (new.id, v_name, v_handle, new.email, v_birthdate, v_age >= 18);

  insert into public.channels (owner_user_id, name, handle, tagline)
  values (new.id, v_name, v_handle, 'New voice on Home Planet TV')
  returning id into v_channel_id;

  update public.users set channel_id = v_channel_id where id = new.id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Counters kept in sync with their detail tables, and notifications
-- fired for the channel owner on follows/likes/comments.
-- ---------------------------------------------------------------------

create or replace function public.handle_follow_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.channels set followers_count = followers_count + 1 where id = new.channel_id;
    insert into public.notifications (user_id, text)
    select c.owner_user_id, u.handle || ' started following you'
    from public.channels c join public.users u on u.id = new.follower_user_id
    where c.id = new.channel_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.channels set followers_count = greatest(followers_count - 1, 0) where id = old.channel_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_follow_change
  after insert or delete on public.follows
  for each row execute function public.handle_follow_change();

create or replace function public.handle_like_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.videos set likes = likes + 1 where id = new.video_id;
    insert into public.notifications (user_id, text)
    select c.owner_user_id, u.handle || ' liked your video "' || v.title || '"'
    from public.videos v
    join public.channels c on c.id = v.channel_id
    join public.users u on u.id = new.user_id
    where v.id = new.video_id and c.owner_user_id <> new.user_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.videos set likes = greatest(likes - 1, 0) where id = old.video_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger on_like_change
  after insert or delete on public.likes
  for each row execute function public.handle_like_change();

create or replace function public.handle_new_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, text)
  select c.owner_user_id, u.handle || ' commented on your video "' || v.title || '"'
  from public.videos v
  join public.channels c on c.id = v.channel_id
  join public.users u on u.id = new.author_user_id
  where v.id = new.video_id and c.owner_user_id <> new.author_user_id;
  return new;
end;
$$;

create trigger on_new_comment
  after insert on public.comments
  for each row execute function public.handle_new_comment();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.channels enable row level security;
alter table public.videos enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;

-- users: public profile fields are readable by anyone; only the owner
-- can update their own row. Rows are created solely by the
-- handle_new_user trigger (security definer), never by client insert.
create policy "users are publicly readable" on public.users
  for select using (true);

create policy "users can update own row" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- channels: public read; only the owner can create/update their own
-- channel (creation still normally happens via the sign-up trigger).
create policy "channels are publicly readable" on public.channels
  for select using (true);

create policy "owner can insert own channel" on public.channels
  for insert with check (auth.uid() = owner_user_id);

create policy "owner can update own channel" on public.channels
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- videos: approved videos are publicly readable, except 18+ videos
-- which require the viewer's own users.is_adult flag. Channel owners
-- can always see their own videos, including pending/rejected ones.
create policy "approved videos are readable, age-gated" on public.videos
  for select using (
    (
      moderation_status = 'approved'
      and (
        not is_adult
        or exists (
          select 1 from public.users u
          where u.id = auth.uid() and u.is_adult
        )
      )
    )
    or exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_user_id = auth.uid()
    )
  );

create policy "owner can insert own videos" on public.videos
  for insert with check (
    exists (
      select 1 from public.channels c
      where c.id = channel_id and c.owner_user_id = auth.uid()
    )
  );

create policy "owner can update own videos" on public.videos
  for update using (
    exists (
      select 1 from public.channels c
      where c.id = videos.channel_id and c.owner_user_id = auth.uid()
    )
  );

-- comments: readable by anyone who can read the underlying video;
-- only signed-in users can post, and only as themselves.
create policy "comments are readable with their video" on public.comments
  for select using (
    exists (
      select 1 from public.videos v where v.id = comments.video_id
    )
  );

create policy "authenticated users can comment" on public.comments
  for insert with check (auth.uid() = author_user_id);

create policy "authors can delete their own comments" on public.comments
  for delete using (auth.uid() = author_user_id);

-- likes: readable by anyone; only the signed-in user can like/unlike
-- as themselves.
create policy "likes are publicly readable" on public.likes
  for select using (true);

create policy "authenticated users can like" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "users can remove their own like" on public.likes
  for delete using (auth.uid() = user_id);

-- follows: readable by anyone; only the signed-in user can follow /
-- unfollow as themselves.
create policy "follows are publicly readable" on public.follows
  for select using (true);

create policy "authenticated users can follow" on public.follows
  for insert with check (auth.uid() = follower_user_id);

create policy "users can unfollow" on public.follows
  for delete using (auth.uid() = follower_user_id);

-- notifications: strictly private to their owner.
create policy "users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "users can mark own notifications read" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
