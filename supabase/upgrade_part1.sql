-- ============================================================
-- KRANTIND UPGRADE — PART 1 of 6
-- profiles, content limits, comments, follows
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
-- KRANTIND — CONSOLIDATED UPGRADE (all batches, idempotent)
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor (New query -> paste -> Run).
-- If it errors, the message shows the failing statement — re-run the whole
-- thing after fixing (every statement is safe to re-run).
--
-- Sections:  [1] pre-flight data fixes   [2] profiles
--            [3] content limits          [4] comments
--            [5] follows                 [6] blocks/reports
--            [7] private accounts        [8] chat v1
--            [9] follow requests         [10] realtime
--            [11] unread counts          [12] post features (pins/polls/...)
--            [13] discovery topics       [14] chat v2 (groups/typing/...)
--            [15] notification prefs     [16] safety (warnings/spam/mod)
--            [17] identity (college/invites)

-- ============================================================
-- [1] PRE-FLIGHT DATA FIXES
-- Trims out-of-range rows BEFORE the length constraints below are added,
-- and de-duplicates usernames before the unique index. All guarded so they
-- no-op on databases that never had these columns.
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'posts' and column_name = 'text') then
    update public.posts set text = left(text, 2000) where char_length(text) > 2000;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'comments' and column_name = 'content') then
    update public.comments set content = left(content, 500) where char_length(content) > 500;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'profiles' and column_name = 'username') then
    -- Keep the oldest profile with a given username; suffix the duplicates.
    update public.profiles p
      set username = p.username || '-' || left(replace(p.id::text, '-', ''), 6)
      where p.username is not null
        and exists (
          select 1 from public.profiles q
          where lower(q.username) = lower(p.username) and q.id < p.id
        );
  end if;
end $$;

-- ============================================================
-- [2] PROFILES
-- ============================================================
alter table public.profiles
  add column if not exists username text;
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
alter table public.profiles
  add column if not exists is_private boolean not null default false;

create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ============================================================
-- [3] CONTENT LIMITS
-- ============================================================
alter table public.posts
  drop constraint if exists posts_text_length;
alter table public.posts
  add constraint posts_text_length check (char_length(text) > 0 and char_length(text) <= 2000);

-- Hashtags (replaces the UI category picker; category column is kept and
-- derived from hashtags client-side so existing data/policies stay valid).
alter table public.posts
  add column if not exists hashtags text[] not null default '{}';

alter table public.comments
  drop constraint if exists comments_content_length;
alter table public.comments
  add constraint comments_content_length check (char_length(trim(content)) > 0 and char_length(content) <= 500);

-- ============================================================
-- [4] COMMENTS: EDIT POLICY + SPAM GUARD
-- ============================================================
drop policy if exists "Users can edit their comments" on public.comments;
create policy "Users can edit their comments"
  on public.comments for update using (auth.uid() = author_id);

create or replace function public.guard_comment_spam()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (select count(*) from public.comments
      where author_id = new.author_id
        and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Too many comments — slow down and try again in a moment.';
  end if;
  return new;
end;
$$;

drop trigger if exists comment_spam_guard on public.comments;
create trigger comment_spam_guard
  before insert on public.comments
  for each row execute function public.guard_comment_spam();

-- ============================================================
-- [5] FOLLOWS (count sync + notification)
-- ============================================================
create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles set follower_count = follower_count + 1 where id = new.following_id;
    update public.profiles set following_count = following_count + 1 where id = new.follower_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles set follower_count = greatest(follower_count - 1, 0) where id = old.following_id;
    update public.profiles set following_count = greatest(following_count - 1, 0) where id = old.follower_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_follow_counts on public.follows;
create trigger sync_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.following_id is distinct from new.follower_id then
    insert into public.notifications (user_id, actor_id, type)
    values (new.following_id, new.follower_id, 'follow');
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_follow on public.follows;
create trigger notify_on_follow
  after insert on public.follows
  for each row execute function public.notify_on_follow();
