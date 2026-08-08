-- Repair GoTrue "Database error querying schema" on login.
-- Manual auth.users inserts leave token columns NULL; GoTrue expects ''.
-- Run this once, then log in with the demo accounts.

-- Fill the nullable token columns GoTrue scans during password login.
update auth.users
set confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    email_change_sent_at = coalesce(email_change_sent_at, now()),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    is_sso_user = coalesce(is_sso_user, false);

-- Ensure the corresponding identity rows exist and are well-formed.
insert into auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), id, email, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email is not null
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'email'
  );