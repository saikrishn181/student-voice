-- ============================================================
-- KRANTIND UPGRADE — PART 6 of 6
-- identity: college email + invite codes
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
alter table public.profiles
  add column if not exists college_email text,
  add column if not exists college_name text,
  add column if not exists college_verified boolean not null default false,
  add column if not exists invite_code text;

create unique index if not exists profiles_invite_code_key
  on public.profiles (lower(invite_code))
  where invite_code is not null;

-- Referral tracking: referred_id signs up using referrer_id's invite code.
create table if not exists public.referrals (
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.referrals enable row level security;
drop policy if exists "Referrals are visible to the two parties" on public.referrals;
create policy "Referrals are visible to the two parties"
  on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id);

-- Extended signup handler: every profile gets a unique invite code, and if the
-- signup carried an invite_code in metadata, the referral is recorded.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_code text;
  v_inviter uuid;
begin
  v_code := lower(substr(md5(new.id::text || clock_timestamp()::text), 1, 8));
  insert into public.profiles (id, name, email, account_type, avatar_url, invite_code)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'account_type', 'student'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    v_code
  )
  on conflict (id) do nothing;

  -- Record the referral if a valid invite code was used.
  if new.raw_user_meta_data ? 'invite_code' then
    select p.id into v_inviter
      from public.profiles p
      where lower(p.invite_code) = lower(new.raw_user_meta_data ->> 'invite_code')
        and p.id <> new.id
      limit 1;
    if v_inviter is not null then
      insert into public.referrals (referrer_id, referred_id)
      values (v_inviter, new.id)
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- College email verification: accepts a recognized Indian education domain
-- (*.edu.in, *.ac.in, or a curated list). No mailer exists, so the check is
-- domain-based; the badge means "this account is tied to a college email".
create or replace function public.verify_college_email(p_email text)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_domain text;
  v_name text;
  v_valid boolean;
begin
  p_email := lower(trim(p_email));
  if p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    return 'invalid';
  end if;
  v_domain := split_part(p_email, '@', 2);
  v_valid := v_domain like '%.edu.in'
    or v_domain like '%.ac.in'
    or v_domain in (
      'iitb.ac.in', 'iitd.ac.in', 'iitm.ac.in', 'iitk.ac.in', 'iitkgp.ac.in',
      'nitk.ac.in', 'bits-pilani.ac.in', 'vit.ac.in', 'iiitd.ac.in', 'iiitb.ac.in'
    );
  if not v_valid then
    return 'not_college';
  end if;
  v_name := split_part(v_domain, '.', 1);
  update public.profiles
    set college_email = p_email,
        college_name = initcap(v_name),
        college_verified = true
    where id = auth.uid();
  return 'ok';
end;
$$;

-- ============================================================
-- DONE — all sections applied.
-- ============================================================
