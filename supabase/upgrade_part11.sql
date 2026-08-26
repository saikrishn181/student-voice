-- Upgrade Part 11: Anonymous Whistleblower, Issue Resolution, and Official Response System
-- Adds columns for anonymous posts, issue resolution victory tracking, and verified official responses.

-- 1. Posts Table Upgrades
alter table public.posts
  add column if not exists is_anonymous boolean not null default false,
  add column if not exists is_resolved boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_note text check (char_length(resolution_note) <= 1000);

-- Index on resolved issues for instant impact queries
create index if not exists posts_is_resolved_idx on public.posts (is_resolved, resolved_at desc);

-- 2. Comments Table Upgrades
alter table public.comments
  add column if not exists is_official_response boolean not null default false;

create index if not exists comments_is_official_idx on public.comments (post_id, is_official_response);

-- 3. Automatic Resolution Trigger (Optional Helper)
-- Ensures resolved_at is timestamped automatically when is_resolved becomes true
create or replace function public.trg_fn_posts_resolution_timestamp()
returns trigger as $$
begin
  if new.is_resolved = true and (old.is_resolved is null or old.is_resolved = false) then
    if new.resolved_at is null then
      new.resolved_at := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_posts_resolution_timestamp on public.posts;
create trigger trg_posts_resolution_timestamp
before update on public.posts
for each row
execute function public.trg_fn_posts_resolution_timestamp();
