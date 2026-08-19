-- Krantind schema for Supabase (Postgres).
--
-- SINGLE-SCRIPT setup: everything the app needs lives in this file. Run it
-- once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- The file is idempotent: safe to re-run. The other .sql files in this folder
-- are legacy; their contents are folded in here.
--
-- Optional seeds (run AFTER this, in this order):
--   1. supabase/seed-auth.sql  (demo auth users)
--   2. supabase/seed-data.sql    (demo posts/comments/notifications)

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- STORAGE BUCKET for post media
-- ============================================================
insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to post-media; anyone may read public objects.
drop policy if exists "post-media: authenticated upload" on storage.objects;
create policy "post-media: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media');

drop policy if exists "post-media: public read" on storage.objects;
create policy "post-media: public read"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "post-media: public update" on storage.objects;
create policy "post-media: public update"
  on storage.objects for update
  using (bucket_id = 'post-media');

drop policy if exists "post-media: public delete" on storage.objects;
create policy "post-media: public delete"
  on storage.objects for delete
  using (bucket_id = 'post-media');

-- ============================================================
-- PROFILES (1:1 with auth.users, created via trigger on signup)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  account_type text not null check (account_type in ('student', 'organization')),
  organization_type text check (organization_type in ('student_union', 'ngo', 'coaching_institute', 'campus_club', 'other')),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  avatar_url text,
  state text,
  district text,
  bio text,
  follower_count integer not null default 0,
  following_count integer not null default 0,
  created_at timestamptz not null default now(),
  -- Username is case-insensitively unique and optional (profile settings).
  username text,
  -- Moderators/admins can review org verification + flags. Default: everyone is 0.
  is_admin boolean not null default false,
  -- Private accounts (students): posts visible only to followers + self.
  is_private boolean not null default false
);

-- Unique on lower(username) so "Jane" and "jane" can't both register.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Admins may review/verify any organization profile (moderation flow).
drop policy if exists "Admins can update any profile" on public.profiles;
create policy "Admins can update any profile"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ============================================================
-- AUTOMATIC PROFILE CREATION ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, account_type, avatar_url, verification_status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'account_type', 'student'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when coalesce(new.raw_user_meta_data ->> 'account_type', 'student') = 'organization'
         then 'pending' else 'pending' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- POSTS
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  text text not null check (char_length(text) > 0 and char_length(text) <= 2000),
  media_url text,
  media_type text check (media_type in ('photo', 'video')),
  media_aspect_ratio numeric,
  state text,
  district text,
  category text not null check (category in ('Academic', 'Harassment', 'Mental Health', 'Financial', 'Exams', 'Placements')),
  hashtags text[] not null default '{}',
  support_count integer not null default 0,
  comment_count integer not null default 0,
  is_pinned boolean not null default false,
  updated_at timestamptz,
  view_count integer not null default 0,
  scheduled_for timestamptz,
  event_at timestamptz,
  event_location text,
  poll_json jsonb,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_scheduled_for_idx on public.posts (scheduled_for);

alter table public.posts enable row level security;

drop policy if exists "Posts are public by everyone" on public.posts;
-- Posts are visible to everyone EXCEPT private accounts (whose posts only the
-- author, their followers, and admins can see).
create policy "Posts visible per privacy"
  on public.posts for select
  using (
    not exists (select 1 from public.profiles p where p.id = posts.author_id and p.is_private)
    or posts.author_id = auth.uid()
    or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = posts.author_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert with check (auth.uid() = author_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update using (auth.uid() = author_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = author_id);

-- ============================================================
-- POST ENGAGEMENT: poll votes, bookmarks, event RSVPs
-- ============================================================
create table if not exists public.poll_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.poll_votes enable row level security;

drop policy if exists "Poll votes are readable" on public.poll_votes;
create policy "Poll votes are readable"
  on public.poll_votes for select using (true);

drop policy if exists "Users vote on polls" on public.poll_votes;
create policy "Users vote on polls"
  on public.poll_votes for insert with check (auth.uid() = user_id);

create table if not exists public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_saves enable row level security;

drop policy if exists "Saves are readable" on public.post_saves;
create policy "Saves are readable"
  on public.post_saves for select using (true);

drop policy if exists "Users manage their saves" on public.post_saves;
create policy "Users manage their saves"
  on public.post_saves for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their saves" on public.post_saves;
create policy "Users delete their saves"
  on public.post_saves for delete using (auth.uid() = user_id);

create table if not exists public.post_rsvps (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_rsvps enable row level security;

drop policy if exists "RSVPs are readable" on public.post_rsvps;
create policy "RSVPs are readable"
  on public.post_rsvps for select using (true);

drop policy if exists "Users manage their RSVPs" on public.post_rsvps;
create policy "Users manage their RSVPs"
  on public.post_rsvps for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their RSVPs" on public.post_rsvps;
create policy "Users delete their RSVPs"
  on public.post_rsvps for delete using (auth.uid() = user_id);

-- ============================================================
-- DISCOVERY: followed hashtag topics
-- ============================================================
create table if not exists public.followed_topics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);

alter table public.followed_topics enable row level security;

drop policy if exists "Users read their topics" on public.followed_topics;
create policy "Users read their topics"
  on public.followed_topics for select using (auth.uid() = user_id);

drop policy if exists "Users add their topics" on public.followed_topics;
create policy "Users add their topics"
  on public.followed_topics for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their topics" on public.followed_topics;
create policy "Users delete their topics"
  on public.followed_topics for delete using (auth.uid() = user_id);

-- ============================================================
-- SUPPORTS (heart toggles)
-- ============================================================
create table if not exists public.post_supports (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.post_supports enable row level security;

drop policy if exists "Supports are public" on public.post_supports;
create policy "Supports are public"
  on public.post_supports for select using (true);

drop policy if exists "Users can support posts" on public.post_supports;
create policy "Users can support posts"
  on public.post_supports for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove their support" on public.post_supports;
create policy "Users can remove their support"
  on public.post_supports for delete using (auth.uid() = user_id);

-- Increment/decrement post.support_count reactively.
create or replace function public.increment_support_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set support_count = support_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set support_count = greatest(support_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists support_count_sync on public.post_supports;
create trigger support_count_sync
  after insert or delete on public.post_supports
  for each row execute function public.increment_support_count();

-- ============================================================
-- COMMENTS
-- ============================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 500),
  is_org_help boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.comments enable row level security;

drop policy if exists "Comments are public" on public.comments;
create policy "Comments are public"
  on public.comments for select using (true);

drop policy if exists "Users can comment" on public.comments;
create policy "Users can comment"
  on public.comments for insert with check (auth.uid() = author_id);

drop policy if exists "Users can edit their comments" on public.comments;
create policy "Users can edit their comments"
  on public.comments for update using (auth.uid() = author_id);

drop policy if exists "Users can delete their comments" on public.comments;
create policy "Users can delete their comments"
  on public.comments for delete using (auth.uid() = author_id);

create or replace function public.increment_comment_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists comment_count_sync on public.comments;
create trigger comment_count_sync
  after insert or delete on public.comments
  for each row execute function public.increment_comment_count();

-- Basic spam guard: reject comment bursts (more than 15 per user per minute).
-- Client-side validation + this DB check give defense in depth; a full rate
-- limiter would live in an Edge Function / gateway in production.
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
-- FOLLOWS
-- ============================================================
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

alter table public.follows enable row level security;

drop policy if exists "Follows are public" on public.follows;
create policy "Follows are public"
  on public.follows for select using (true);

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists "Users can unfollow others" on public.follows;
create policy "Users can unfollow others"
  on public.follows for delete using (auth.uid() = follower_id);

-- Keeps profiles.follower_count / following_count in sync automatically.
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

-- ============================================================
-- FOLLOW REQUESTS (private accounts require approval)
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

-- Accepting a request creates the actual follow (counts + notification are
-- handled by the follows triggers above).
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

-- Notify the target of the incoming request.
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

-- Public profile stats (post count is hidden by RLS for private accounts, so
-- this security-definer function is the safe way to show counts to everyone).
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

-- ============================================================
-- BLOCKS (mute a user so their posts disappear from your feed)
-- ============================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "Users see their own blocks" on public.blocks;
create policy "Users see their own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);

drop policy if exists "Users can create blocks" on public.blocks;
create policy "Users can create blocks"
  on public.blocks for insert with check (auth.uid() = blocker_id);

drop policy if exists "Users can remove blocks" on public.blocks;
create policy "Users can remove blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

-- ============================================================
-- REPORTS (flag a post for moderation)
-- ============================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  -- One report per post per user, so spamming "report" can't flood the queue.
  unique (reporter_id, post_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can report" on public.reports;
create policy "Users can report"
  on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Users see only their own reports" on public.reports;
create policy "Users see only their own reports"
  on public.reports for select using (auth.uid() = reporter_id);

-- Admins review the moderation queue (admin page).
drop policy if exists "Admins see all reports" on public.reports;
create policy "Admins see all reports"
  on public.reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Admins can resolve/review reports.
drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports"
  on public.reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('support', 'comment', 'follow', 'offer_help', 'verification_approved', 'follow_request')),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users see their own notifications" on public.notifications;
create policy "Users see their own notifications"
  on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users update their own notifications" on public.notifications;
create policy "Users update their own notifications"
  on public.notifications for update using (auth.uid() = user_id);

-- Create a 'support' or 'comment' notification when someone interacts with a post.
create or replace function public.notify_on_post_interaction()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
begin
  if (tg_table_name = 'post_supports') then
    if (tg_op = 'INSERT') then
      select author_id into v_post_owner from public.posts where id = new.post_id;
      if v_post_owner is distinct from new.user_id then
        insert into public.notifications (user_id, actor_id, post_id, type)
        values (v_post_owner, new.user_id, new.post_id, 'support');
      end if;
    end if;
    return null;
  end if;

  if (tg_table_name = 'comments') then
    if (tg_op = 'INSERT') then
      select author_id into v_post_owner from public.posts where id = new.post_id;
      if v_post_owner is distinct from new.author_id then
        insert into public.notifications (user_id, actor_id, post_id, type)
        values (v_post_owner, new.author_id, new.post_id,
                case when new.is_org_help then 'offer_help' else 'comment' end);
      end if;
    end if;
    return null;
  end if;

  return null;
end;
$$;

drop trigger if exists notify_on_support on public.post_supports;
create trigger notify_on_support
  after insert on public.post_supports
  for each row execute function public.notify_on_post_interaction();

drop trigger if exists notify_on_comment on public.comments;
create trigger notify_on_comment
  after insert on public.comments
  for each row execute function public.notify_on_post_interaction();

-- Notify when someone starts following you.
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

-- ============================================================
-- CHAT (1:1 direct messages + groups)
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  read_at timestamptz,
  attachment_url text,
  attachment_type text check (attachment_type in ('photo', 'video')),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index if not exists participants_user_idx on public.conversation_participants (user_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Helper: is `p_user` a participant of conversation `p_conv`? SECURITY DEFINER so
-- policies can check membership WITHOUT re-entering conversation_participants
-- RLS (a plain subquery in the policy recurses infinitely).
create or replace function public.is_conversation_participant(p_conv uuid, p_user uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conv and cp.user_id = p_user
  );
$$;

drop policy if exists "Participants see their conversations" on public.conversations;
create policy "Participants see their conversations"
  on public.conversations for select
  using (public.is_conversation_participant(conversations.id, auth.uid()));

drop policy if exists "Participants see conversation members" on public.conversation_participants;
create policy "Participants see conversation members"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Participants see messages" on public.messages;
create policy "Participants see messages"
  on public.messages for select
  using (public.is_conversation_participant(messages.conversation_id, auth.uid()));

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(messages.conversation_id, auth.uid())
  );

-- Atomically find (or create) the 1:1 conversation between the caller and
-- another user. Returns the conversation id. Private accounts can only be
-- messaged by the owner, their followers, and admins.
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conv uuid;
begin
  if not public.can_message_user(p_other) then
    raise exception 'PRIVATE_ACCOUNT_NOT_ALLOWED';
  end if;

  select cp.conversation_id into v_conv
  from public.conversation_participants cp
  where cp.user_id = auth.uid()
    and cp.conversation_id in (
      select cp2.conversation_id from public.conversation_participants cp2
      where cp2.user_id = p_other
    )
    and (select count(*) from public.conversation_participants cp3
         where cp3.conversation_id = cp.conversation_id) = 2
  limit 1;

  if v_conv is null then
    insert into public.conversations default values returning id into v_conv;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, auth.uid()), (v_conv, p_other);
  end if;

  return v_conv;
end;
$$;

-- Private accounts: only the account owner, their followers, and admins can
-- message them. Everyone else gets a clear error.
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
-- CHAT V2: typing, read receipts, groups
-- ============================================================
create table if not exists public.chat_typing (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.chat_typing enable row level security;

drop policy if exists "Participants see typing" on public.chat_typing;
create policy "Participants see typing"
  on public.chat_typing for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Users update their typing state" on public.chat_typing;
create policy "Users update their typing state"
  on public.chat_typing for insert
  with check (auth.uid() = user_id and public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Users clear their typing state" on public.chat_typing;
create policy "Users clear their typing state"
  on public.chat_typing for update using (auth.uid() = user_id);

drop policy if exists "Users delete their typing state" on public.chat_typing;
create policy "Users delete their typing state"
  on public.chat_typing for delete using (auth.uid() = user_id);

-- Mark incoming messages read + bump my last_read_at (SECURITY DEFINER bypasses
-- RLS so the UPDATE policy on messages doesn't need widening).
create or replace function public.mark_messages_read(p_conversation uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_conversation_participant(p_conversation, auth.uid()) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  update public.messages
    set read_at = now()
    where conversation_id = p_conversation and sender_id <> auth.uid() and read_at is null;
  update public.conversation_participants
    set last_read_at = now()
    where conversation_id = p_conversation and user_id = auth.uid();
end;
$$;

-- Create a group conversation. Creator + at least one other member.
create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conv uuid;
  v_member uuid;
begin
  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'EMPTY_TITLE';
  end if;
  if p_member_ids is null or array_length(p_member_ids, 1) is null or array_length(p_member_ids, 1) < 1 then
    raise exception 'NO_MEMBERS';
  end if;
  insert into public.conversations (title, is_group)
    values (trim(p_title), true) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, auth.uid());
  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id)
        values (v_conv, v_member);
    end if;
  end loop;
  return v_conv;
end;
$$;

-- Add members to an existing group (any participant can add; PK upserts skip
-- duplicates silently).
create or replace function public.add_group_members(p_conversation uuid, p_member_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member uuid;
  v_is_group boolean;
begin
  if not public.is_conversation_participant(p_conversation, auth.uid()) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  select is_group into v_is_group from public.conversations where id = p_conversation;
  if not coalesce(v_is_group, false) then
    raise exception 'NOT_A_GROUP';
  end if;
  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id)
        values (p_conversation, v_member)
        on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- ============================================================
-- REALTIME (live feed updates)
-- ============================================================
-- Enables Postgres-level change events for posts so the feed can update
-- without polling. (Optional: without this the app still works, just without
-- live updates. Requires the Realtime feature to be enabled on the project.)
do $$
begin
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
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_typing'
  ) then
    alter publication supabase_realtime add table public.chat_typing;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_participants'
  ) then
    alter publication supabase_realtime add table public.conversation_participants;
  end if;
end
$$;
-- ============================================================
-- Notification preferences + email digest queue
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

-- Queue one digest per user with unread notifications + 'daily' preference.
-- Safe to run repeatedly (skips users who already have a pending digest).
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
