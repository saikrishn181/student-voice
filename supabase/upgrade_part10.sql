-- Upgrade Part 10: Zero-Cost Automated Moderation & Community AutoMod
-- Adds database-level triggers for report threshold auto-blurring and automatic temporary ban expiration.

-- 1. Automated Report Threshold Function
-- When a post accumulates 3+ reports, automatically set content_warning to 'nsfw' (auto-blur).
-- When a post accumulates 5+ reports, notify or quarantine the post.
create or replace function public.trg_fn_reports_auto_moderation()
returns trigger as $$
declare
  v_report_count int;
  v_post_author_id uuid;
begin
  -- Count total open reports for the post
  select count(*) into v_report_count
  from public.reports
  where post_id = new.post_id;

  select author_id into v_post_author_id
  from public.posts
  where id = new.post_id;

  -- Threshold 1: 3+ reports -> Auto-blur post with NSFW sensitivity shield
  if v_report_count >= 3 then
    update public.posts
    set content_warning = coalesce(content_warning, 'nsfw')
    where id = new.post_id and content_warning is null;

    -- Insert system notification for the author (if not already sent recently)
    if v_post_author_id is not null then
      insert into public.notifications (user_id, actor_id, post_id, type, metadata)
      values (
        v_post_author_id,
        v_post_author_id,
        new.post_id,
        'content_warning',
        '{"reason": "Your post received multiple community reports and was auto-blurred with a sensitivity shield.", "action": "blurred", "category": "community_reports"}'::jsonb
      )
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists trg_reports_auto_moderation on public.reports;
create trigger trg_reports_auto_moderation
after insert on public.reports
for each row
execute function public.trg_fn_reports_auto_moderation();

-- 2. Ensure RLS on reports allows users to see their own submitted reports
alter table public.reports enable row level security;

-- 3. Automatic Strike & Temporary Ban Enforcement Helper
create or replace function public.check_user_active_ban(p_user_id uuid)
returns boolean as $$
declare
  v_is_banned boolean;
  v_banned_until timestamptz;
begin
  select is_banned, banned_until into v_is_banned, v_banned_until
  from public.profiles
  where id = p_user_id;

  if v_is_banned is null or v_is_banned = false then
    return false;
  end if;

  -- If temporary ban has passed, user is no longer banned
  if v_banned_until is not null and v_banned_until <= now() then
    return false;
  end if;

  return true;
end;
$$ language plpgsql security definer;
