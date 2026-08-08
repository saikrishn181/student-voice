-- Wipe all DEMO/SEED data so the app starts with only real user data.
-- Deletes the 5 seeded demo auth users and everything cascades from them
-- (profiles, posts, comments, supports, follows, notifications).
-- Real accounts that you signed up through the app are NOT touched.

delete from auth.identities
where user_id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

delete from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- Safety: if any seed-era posts/comments by now-deleted users lingered, clean
-- them by affinity with the demo emails (ananya/sanika/rahul/union/vidya).
delete from public.posts
where author_id not in (select id from public.profiles);

-- Show what remains (should be only real accounts / real content).
select 'remaining profiles' as label, count(*) from public.profiles
union all
select 'remaining posts', count(*) from public.posts;