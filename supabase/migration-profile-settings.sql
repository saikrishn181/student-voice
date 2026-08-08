-- Adds the `username` column to profiles for the profile-edit/settings feature.
-- Usernames are case-insensitively unique, optional, and start with an @-less
-- handle. Run AFTER schema.sql (idempotent; safe to run multiple times).

alter table public.profiles
  add column if not exists username text;

-- Unique on lower(username) so "Jane" and "jane" can't both register.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username))
  where username is not null;