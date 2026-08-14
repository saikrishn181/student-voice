-- DEPRECATED: FOLDED INTO supabase/schema.sql (notify_on_follow). Kept only
-- for old installs; use supabase/upgrade_schema.sql instead.
-- Adds a notification when someone starts following you.
-- Standalone migration — append to supabase/schema.sql or run alone in the SQL editor.
-- The `follow` notification type is already allowed by the notifications check constraint.

create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Don't notify when you follow yourself (defensive; the app prevents it).
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