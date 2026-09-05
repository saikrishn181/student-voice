-- Migration: Followers-Only Posts, Anonymous Mode, and Friends-Also Visibility for Private Accounts
-- Run this in your Supabase SQL Editor:

-- 1. Add is_followers_only and friends_also columns to public.posts
alter table public.posts
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists is_followers_only boolean not null default false,
  add column if not exists friends_also boolean not null default false;

-- 2. Update SELECT policy on posts:
-- Followers-only posts are visible only to the author, their accepted followers, and admins.
-- All other posts are visible to everyone (with anonymity masking applied in frontend).
drop policy if exists "Posts visible per privacy" on public.posts;
drop policy if exists "Posts are public by everyone" on public.posts;
drop policy if exists "Posts visibility policy" on public.posts;

create policy "Posts visibility policy"
  on public.posts for select
  using (
    case
      when is_followers_only = true then
        author_id = auth.uid()
        or exists (
          select 1 from public.follows f
          where f.follower_id = auth.uid() and f.following_id = posts.author_id
        )
        or exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.is_admin
        )
      else
        true
    end
  );

-- 3. Trigger to ensure any post authored by a private account is automatically marked is_anonymous = true
-- UNLESS explicitly chosen as followers-only.
create or replace function public.ensure_private_account_post_rules()
returns trigger language plpgsql security definer as $$
begin
  if exists (select 1 from public.profiles where id = new.author_id and is_private = true) then
    if new.is_followers_only is not true then
      new.is_anonymous := true;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ensure_private_account_post_anonymous on public.posts;
drop trigger if exists trg_ensure_private_account_post_rules on public.posts;
create trigger trg_ensure_private_account_post_rules
  before insert or update on public.posts
  for each row execute function public.ensure_private_account_post_rules();

-- 4. Retroactively set is_anonymous = true for any existing posts created by private accounts that aren't followers-only
update public.posts
set is_anonymous = true
where author_id in (select id from public.profiles where is_private = true)
  and is_followers_only = false;
