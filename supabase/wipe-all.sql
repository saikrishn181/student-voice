-- TOTAL WIPE: deletes EVERYTHING so the app is a clean newborn.
-- Removes: all auth users (and their identities), all profiles (cascades to
-- posts/comments/supports/follows/notifications).
-- Run this ONCE. After it, register a brand-new account in the app.
--
-- NOTE: uploaded media files in the `post-media` bucket are NOT removed here —
-- Supabase forbids direct deletes from storage.objects (owner-level). They are
-- orphaned but harmless: no post references them. Optionally clear them later
-- via Dashboard -> Storage -> post-media -> select all -> Delete.

-- 1) Auth identities first (FK to auth.users)
delete from auth.identities;

-- 2) All users — cascades to profiles -> posts -> comments/supports/notifications
delete from auth.users;

-- 3) Direct tables are emptied by the cascade above, but clear them anyway in
--    case any row survived without a valid auth user.
truncate table public.reports cascade;
truncate table public.blocks cascade;
truncate table public.notifications cascade;
truncate table public.follows cascade;
truncate table public.comments cascade;
truncate table public.post_supports cascade;
truncate table public.posts cascade;
truncate table public.profiles cascade;

-- 4. Report what remains (should all be 0).
select 'profiles' as t, count(*) from public.profiles
union all select 'posts', count(*) from public.posts
union all select 'comments', count(*) from public.comments
union all select 'auth_users', count(*) from auth.users;