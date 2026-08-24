-- Upgrade Part 9: NSFW Moderation Notifications
-- Adds content_warning and post_removed notification types, plus metadata column.

-- 1. Expand the CHECK constraint on notifications.type to include new moderation types
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'support', 'comment', 'follow', 'offer_help',
    'verification_approved', 'follow_request',
    'content_warning', 'post_removed'
  ));

-- 2. Add metadata column for storing moderation details (reason, strike count, action)
alter table public.notifications
  add column if not exists metadata jsonb default null;

-- 3. Allow authenticated users to INSERT moderation notifications for themselves
drop policy if exists "Users insert their own moderation notifications" on public.notifications;
create policy "Users insert their own moderation notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);
