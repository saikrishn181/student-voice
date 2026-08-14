-- Run ONLY if schema.sql ever failed partway and left partial tables behind.
-- Drops every StudentVoice object so schema.sql can be re-run cleanly.
-- (This does NOT touch auth.users / auth.identities.)

drop trigger if exists notify_on_support on public.post_supports;
drop trigger if exists notify_on_comment on public.comments;
drop trigger if exists notify_on_follow on public.follows;
drop trigger if exists support_count_sync on public.post_supports;
drop trigger if exists comment_count_sync on public.comments;
drop trigger if exists comment_spam_guard on public.comments;
drop trigger if exists sync_follow_counts on public.follows;
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.reports;
drop table if exists public.blocks;
drop table if exists public.notifications;
drop table if exists public.follows;
drop table if exists public.comments;
drop table if exists public.post_supports;
drop table if exists public.posts;
drop table if exists public.profiles;

drop function if exists public.handle_new_user();
drop function if exists public.increment_support_count();
drop function if exists public.increment_comment_count();
drop function if exists public.notify_on_post_interaction();
drop function if exists public.notify_on_follow();
drop function if exists public.sync_follow_counts();
drop function if exists public.guard_comment_spam();