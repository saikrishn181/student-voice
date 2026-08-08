-- Demo posts, comments, supports, follows, notifications.
-- Run AFTER schema.sql + seed-auth.sql (FKs reference seeded user ids).

-- ============================================================
-- FOLLOWS
-- ============================================================
insert into public.follows (follower_id, following_id, created_at) values
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', now() - interval '10 days'),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', now() - interval '9 days'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', now() - interval '8 days')
on conflict (follower_id, following_id) do nothing;

-- ============================================================
-- POSTS
-- ============================================================
insert into public.posts
  (id, author_id, text, media_url, media_type, media_aspect_ratio, state, district, category, support_count, comment_count, created_at)
values
  ('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   'The water cooler on the 3rd floor has been broken for 3 days and nobody has raised a complaint. 200+ students use this floor daily — please help us get it fixed!',
   'https://images.unsplash.com/photo-1524338188336-0a6c5729c519?auto=format&fit=crop&w=1200&q=60',
   'photo', 1.5, 'Maharashtra', 'Mumbai', 'Academic', 42, 6, now() - interval '3 days'),

  ('00000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333',
   'Placement notifications keep going out after deadlines. We need a central announcement channel for the placement cell.',
   null, null, null, 'Karnataka', 'Bengaluru', 'Placements', 87, 14, now() - interval '4 days'),

  ('00000000-0000-0000-0000-000000000003', '55555555-5555-5555-5555-555555555555',
   'Your mental health matters. We are offering free 30-minute counselling slots for all students in Chennai — just reply here or check our page.',
   null, null, null, 'Tamil Nadu', 'Chennai', 'Mental Health', 153, 28, now() - interval '5 days'),

  ('00000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   'Exam timetable clash detected — Hindi paper and Project viva on the same 2 PM slot for many of us. Sharing a petition; sign it and let''s get it fixed by the controller.',
   null, null, null, 'Maharashtra', 'Mumbai', 'Exams', 122, 17, now() - interval '6 days')
on conflict (id) do nothing;

-- Manually set support counts AFTER insert (the trigger only adjusts on change).
update public.posts set support_count = 42 where id = '00000000-0000-0000-0000-000000000001';
update public.posts set support_count = 87 where id = '00000000-0000-0000-0000-000000000002';
update public.posts set support_count = 153 where id = '00000000-0000-0000-0000-000000000003';
update public.posts set support_count = 122 where id = '00000000-0000-0000-0000-000000000004';
update public.posts set comment_count = 6 where id = '00000000-0000-0000-0000-000000000001';
update public.posts set comment_count = 14 where id = '00000000-0000-0000-0000-000000000002';
update public.posts set comment_count = 28 where id = '00000000-0000-0000-0000-000000000003';
update public.posts set comment_count = 17 where id = '00000000-0000-0000-0000-000000000004';

-- ============================================================
-- SUPPORTS (from demo users, post #1)
-- ============================================================
insert into public.post_supports (post_id, user_id, created_at) values
  ('00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', now() - interval '2 days'),
  ('00000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', now() - interval '1 day')
on conflict (post_id, user_id) do nothing;

-- ============================================================
-- COMMENTS
-- ============================================================
insert into public.comments (id, post_id, author_id, content, is_org_help, created_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222',
   'We''ve been dealing with this for weeks too. The maintenance portal has an open ticket, but nobody responds.', false, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'We can file an online complaint with the campus maintenance portal tomorrow. If you want, our volunteers will guide you through it.', true, now() - interval '1 day')
on conflict (id) do nothing;

-- ============================================================
-- NOTIFICATIONS for demo user Ananya (id 1111…)
-- ============================================================
insert into public.notifications
  (id, user_id, type, actor_id, post_id, read, created_at)
values
  ('00000000-0000-0000-0000-0000000000b1', '11111111-1111-1111-1111-111111111111', 'support', '33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', false, now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000b2', '11111111-1111-1111-1111-111111111111', 'offer_help', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', false, now() - interval '5 hours'),
  ('00000000-0000-0000-0000-0000000000b3', '11111111-1111-1111-1111-111111111111', 'follow', '22222222-2222-2222-2222-222222222222', null, true, now() - interval '2 days')
on conflict (id) do nothing;