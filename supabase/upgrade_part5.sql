-- ============================================================
-- KRANTIND UPGRADE — PART 5 of 6
-- notification preferences, safety
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  muted_types text[] not null default '{}',
  digest_frequency text not null default 'daily'
    check (digest_frequency in ('instant', 'daily', 'never')),
  updated_at timestamptz not null default now()
);
alter table public.notification_preferences enable row level security;
drop policy if exists "Users read their notification preferences" on public.notification_preferences;
create policy "Users read their notification preferences"
  on public.notification_preferences for select using (auth.uid() = user_id);
drop policy if exists "Users upsert their notification preferences" on public.notification_preferences;
create policy "Users upsert their notification preferences"
  on public.notification_preferences for insert with check (auth.uid() = user_id);
drop policy if exists "Users update their notification preferences" on public.notification_preferences;
create policy "Users update their notification preferences"
  on public.notification_preferences for update using (auth.uid() = user_id);

-- Queue for email digests. An external worker (pg_cron / edge function) calls
-- queue_daily_digests() and then marks rows 'sent'; rows are 'pending' until
-- then. The app itself has no mailer, so this is the contract for one.
create table if not exists public.email_digests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content jsonb not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.email_digests enable row level security;
drop policy if exists "Users read their email digests" on public.email_digests;
create policy "Users read their email digests"
  on public.email_digests for select using (auth.uid() = user_id);

-- Build one digest row per user that has unread notifications and a 'daily'
-- digest preference. Returns how many digests were queued. Safe to run
-- repeatedly (each run only queues for users with new unread notifications).
create or replace function public.queue_daily_digests()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_user uuid;
  v_unread bigint;
  v_types text[];
  v_last_digest timestamptz;
begin
  for v_user in
    select np.user_id from public.notification_preferences np
    where np.digest_frequency = 'daily'
  loop
    select count(*) into v_unread
      from public.notifications n
      where n.user_id = v_user and not n.read;
    if v_unread > 0 then
      -- Skip if an identical digest is already queued (idempotent per run).
      select max(d.scheduled_for) into v_last_digest
        from public.email_digests d
        where d.user_id = v_user and d.status = 'pending';
      if v_last_digest is null or v_last_digest < now() then
        select array_agg(distinct n.type) into v_types
          from public.notifications n
          where n.user_id = v_user and not n.read;
        insert into public.email_digests (user_id, content, scheduled_for)
        values (
          v_user,
          jsonb_build_object('unread_count', v_unread, 'types', v_types),
          now() + interval '1 day'
        );
        v_count := v_count + 1;
      end if;
    end if;
  end loop;
  return v_count;
end;
$$;

-- ============================================================
-- [16] SAFETY: content warnings, post spam guard, admin moderation deletes
-- ============================================================
alter table public.posts
  add column if not exists content_warning text
  check (content_warning is null or content_warning in ('nsfw', 'spoiler', 'triggering', 'graphic'));

-- Post spam guard (parallel to guard_comment_spam): max 4 posts per minute,
-- max 12 posts per hour, per user. Admins are exempt.
create or replace function public.guard_post_spam()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.author_id and p.is_admin) then
    if (select count(*) from public.posts
        where author_id = new.author_id
          and created_at > now() - interval '1 minute') >= 4 then
      raise exception 'Too many posts — slow down and try again in a moment.';
    end if;
    if (select count(*) from public.posts
        where author_id = new.author_id
          and created_at > now() - interval '1 hour') >= 12 then
      raise exception 'Post limit reached for the hour — come back later.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists post_spam_guard on public.posts;
create trigger post_spam_guard
  before insert on public.posts
  for each row execute function public.guard_post_spam();

-- Admins (moderators) may delete any post or comment (content moderation).
drop policy if exists "Users can delete their posts" on public.posts;
create policy "Users can delete their posts"
  on public.posts for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Users can delete their comments" on public.comments;
create policy "Users can delete their comments"
  on public.comments for delete
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );
