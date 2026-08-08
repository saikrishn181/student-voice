-- Seed demo users into auth.users + auth.identities so you can log in with a
-- known password. Run AFTER schema.sql (it requires the profiles trigger).
-- All demo accounts:  demo1234

create extension if not exists "pgcrypto";

with demo as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as id,
    'ananya@example.com' as email,
    'Ananya Sharma' as name,
    'student' as account_type
  union all select
    '22222222-2222-2222-2222-222222222222'::uuid, 'sanika@example.com', 'Sanika Deshmukh', 'student'
  union all select
    '33333333-3333-3333-3333-333333333333'::uuid, 'rahul@example.com', 'Rahul Menon', 'student'
  union all select
    '44444444-4444-4444-4444-444444444444'::uuid, 'union@example.com', $demo$JNU Students' Union$demo$, 'organization'
  union all select
    '55555555-5555-5555-5555-555555555555'::uuid, 'help@vidyafoundation.org', 'Vidya Education Foundation', 'organization'
)
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
   raw_app_meta_data, raw_user_meta_data,
   confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current,
   created_at, updated_at)
select
  '00000000-0000-0000-0000-000000000000'::uuid,
  d.id,
  'authenticated',
  'authenticated',
  d.email,
  crypt('demo1234', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', d.name, 'account_type', d.account_type),
  '', '', '', '', '',
  now(),
  now()
from demo d
on conflict do nothing;

with demo as (
  select
    '11111111-1111-1111-1111-111111111111'::uuid as id,
    'ananya@example.com' as email
  union all select '22222222-2222-2222-2222-222222222222', 'sanika@example.com'
  union all select '33333333-3333-3333-3333-333333333333', 'rahul@example.com'
  union all select '44444444-4444-4444-4444-444444444444', 'union@example.com'
  union all select '55555555-5555-5555-5555-555555555555', 'help@vidyafoundation.org'
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  d.id,
  d.id,
  d.email,
  'email',
  jsonb_build_object('sub', d.id::text, 'email', d.email),
  now(),
  now(),
  now()
from demo d
on conflict do nothing;

-- The org triggers create profiles as 'pending'; mark the seeded orgs verified.
update public.profiles
set account_type = 'organization',
    organization_type = 'student_union',
    verification_status = 'verified'
where id = '44444444-4444-4444-4444-444444444444';

update public.profiles
set account_type = 'organization',
    organization_type = 'ngo',
    verification_status = 'verified'
where id = '55555555-5555-5555-5555-555555555555';