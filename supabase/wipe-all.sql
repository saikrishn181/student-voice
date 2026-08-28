-- ============================================================
-- KRANTIND 100% TOTAL CLEAN PURGE SCRIPT
-- Deletes all test/fake users, posts, chats, comments, supports,
-- follows, notifications, reports, and auth credentials.
--
-- HOW TO RUN:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Go to "SQL Editor" on the left sidebar
-- 3. Paste this script and click "Run" (or Ctrl + Enter)
-- ============================================================

-- 1. Truncate all application data tables with cascade
truncate table public.chat_typing cascade;
truncate table public.messages cascade;
truncate table public.conversation_participants cascade;
truncate table public.conversations cascade;
truncate table public.poll_votes cascade;
truncate table public.post_rsvps cascade;
truncate table public.post_saves cascade;
truncate table public.post_supports cascade;
truncate table public.comments cascade;
truncate table public.reports cascade;
truncate table public.blocks cascade;
truncate table public.notifications cascade;
truncate table public.notification_preferences cascade;
truncate table public.follow_requests cascade;
truncate table public.follows cascade;
truncate table public.user_strikes cascade;
truncate table public.college_verifications cascade;
truncate table public.posts cascade;
truncate table public.profiles cascade;

-- 2. Delete all authentication users & identities
delete from auth.identities;
delete from auth.sessions;
delete from auth.mfa_amr_claims;
delete from auth.mfa_factors;
delete from auth.mfa_challenges;
delete from auth.refresh_tokens;
delete from auth.users;

-- 3. Verification check: returns 0 for all rows
select 'profiles' as "Table", count(*) as "Remaining Rows" from public.profiles
union all select 'posts', count(*) from public.posts
union all select 'comments', count(*) from public.comments
union all select 'conversations', count(*) from public.conversations
union all select 'messages', count(*) from public.messages
union all select 'notifications', count(*) from public.notifications
union all select 'auth_users', count(*) from auth.users;