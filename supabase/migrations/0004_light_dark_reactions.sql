-- Home Planet TV — "Light or Dark?" video reactions: a bolder, binary
-- alternative to the 5-heart rating, mutually exclusive per user
-- (mirrors the ratings pattern in 0002_creator_features.sql).

alter table public.videos
  add column light_count integer not null default 0,
  add column dark_count integer not null default 0;

create table public.video_reactions (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  reaction text not null check (reaction in ('light', 'dark')),
  created_at timestamptz not null default now(),
  unique (video_id, user_id)
);

create index video_reactions_video_id_idx on public.video_reactions (video_id);

-- Keep videos.light_count/dark_count in sync by recomputing from
-- public.video_reactions on every change (same drift-free approach as
-- the ratings trigger).
create or replace function public.handle_video_reaction_change()
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
    light_count = (select count(*) from public.video_reactions where video_id = v_video_id and reaction = 'light'),
    dark_count = (select count(*) from public.video_reactions where video_id = v_video_id and reaction = 'dark')
  where v.id = v_video_id;
  return coalesce(new, old);
end;
$$;

create trigger on_video_reaction_change
  after insert or update or delete on public.video_reactions
  for each row execute function public.handle_video_reaction_change();

alter table public.video_reactions enable row level security;

create policy "video reactions are publicly readable" on public.video_reactions
  for select using (true);

create policy "users can react as themselves" on public.video_reactions
  for insert with check (auth.uid() = user_id);

create policy "users can change their own reaction" on public.video_reactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can remove their own reaction" on public.video_reactions
  for delete using (auth.uid() = user_id);
