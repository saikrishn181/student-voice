-- StudentVoice schema for Supabase (Postgres).
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).

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

drop policy if exists "post-media: authenticated update" on storage.objects;
create policy "post-media: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-media' and owner = auth.uid());

drop policy if exists "post-media: authenticated delete" on storage.objects;
create policy "post-media: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and owner = auth.uid());

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
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

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
  text text not null check (char_length(text) > 0),
  media_url text,
  media_type text check (media_type in ('photo', 'video')),
  media_aspect_ratio numeric,
  state text,
  district text,
  category text not null check (category in ('Academic', 'Harassment', 'Mental Health', 'Financial', 'Exams', 'Placements')),
  support_count integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Posts are public by everyone" on public.posts;
create policy "Posts are public by everyone"
  on public.posts for select using (true);

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
  content text not null check (char_length(trim(content)) > 0),
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

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('support', 'comment', 'follow', 'offer_help', 'verification_approved')),
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
  v_author uuid;
  n_type text;
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

-- ============================================================
-- SEED DATA
-- ============================================================
-- Seed users must already exist in auth.users for the FK to pass. The app lets
-- you sign up normally; run `seed-auth.sql` afterward to add demo sign-ins, then
-- `seed-data.sql` for posts/comments/notifications.