-- ============================================================
-- KRANTIND UPGRADE — PART 3 of 6
-- follow requests, realtime, unread counts
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
--     + can_message_user
-- ============================================================
create table if not exists public.follow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (requester_id, target_id)
);

create index if not exists follow_requests_target_idx on public.follow_requests (target_id, status);

alter table public.follow_requests enable row level security;

drop policy if exists "Users see follow requests" on public.follow_requests;
create policy "Users see follow requests"
  on public.follow_requests for select
  using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "Users request to follow" on public.follow_requests;
create policy "Users request to follow"
  on public.follow_requests for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Targets update follow requests" on public.follow_requests;
create policy "Targets update follow requests"
  on public.follow_requests for update
  using (auth.uid() = target_id);

drop policy if exists "Requesters delete follow requests" on public.follow_requests;
create policy "Requesters delete follow requests"
  on public.follow_requests for delete
  using (auth.uid() = requester_id);

create or replace function public.accept_follow_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.follows (follower_id, following_id)
    values (new.requester_id, new.target_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists accept_follow_request on public.follow_requests;
create trigger accept_follow_request
  after update on public.follow_requests
  for each row execute function public.accept_follow_request();

create or replace function public.notify_on_follow_request()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.target_id is distinct from new.requester_id then
    insert into public.notifications (user_id, actor_id, type)
    values (new.target_id, new.requester_id, 'follow_request');
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_follow_request on public.follow_requests;
create trigger notify_on_follow_request
  after insert on public.follow_requests
  for each row execute function public.notify_on_follow_request();

create or replace function public.get_profile_stats(p_user uuid)
returns table (posts_count bigint, follower_count bigint, following_count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    (select count(*) from public.posts where author_id = p_user)::bigint,
    (select count(*) from public.follows where following_id = p_user)::bigint,
    (select count(*) from public.follows where follower_id = p_user)::bigint;
end;
$$;

-- Allow the new 'follow_request' notification type (fresh installs already
-- have it via schema.sql; this handles older databases).
alter table public.notifications
  drop constraint if exists notifications_type_check;
alter table public.notifications
  add constraint notifications_type_check
  check (type in ('support', 'comment', 'follow', 'offer_help', 'verification_approved', 'follow_request'));

-- Chat gating for private accounts.
create or replace function public.can_message_user(p_other uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() = p_other then
    return true;
  end if;
  if exists (select 1 from public.profiles p where p.id = p_other and not p.is_private) then
    return true;
  end if;
  if exists (select 1 from public.follows f
             where f.follower_id = auth.uid() and f.following_id = p_other) then
    return true;
  end if;
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return true;
  end if;
  return false;
end;
$$;

-- ============================================================
-- [10] REALTIME (guarded: skips cleanly if the publication is missing)
-- ============================================================
do $$
begin
  if exists (select 1 from pg_publication p where p.pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'posts'
    ) then
      alter publication supabase_realtime add table public.posts;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'messages'
    ) then
      alter publication supabase_realtime add table public.messages;
    end if;
  end if;
end
$$;

-- ============================================================
-- [11] CHAT UNREAD COUNTS
-- ============================================================
-- Tracks when each participant last opened a conversation so the inbox can
-- show unread badges. Existing rows start with NULL = "all read".
alter table public.conversation_participants
  add column if not exists last_read_at timestamptz;
