-- ============================================================
-- KRANTIND UPGRADE — PART 2 of 6
-- blocks/reports, private accounts, chat v1
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

drop policy if exists "Users see their own blocks" on public.blocks;
create policy "Users see their own blocks"
  on public.blocks for select using (auth.uid() = blocker_id);

drop policy if exists "Users can create blocks" on public.blocks;
create policy "Users can create blocks"
  on public.blocks for insert with check (auth.uid() = blocker_id);

drop policy if exists "Users can remove blocks" on public.blocks;
create policy "Users can remove blocks"
  on public.blocks for delete using (auth.uid() = blocker_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'misinformation', 'inappropriate', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, post_id)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can report" on public.reports;
create policy "Users can report"
  on public.reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Users see only their own reports" on public.reports;
create policy "Users see only their own reports"
  on public.reports for select using (auth.uid() = reporter_id);

drop policy if exists "Admins see all reports" on public.reports;
create policy "Admins see all reports"
  on public.reports for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports"
  on public.reports for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- ============================================================
-- [7] PRIVATE ACCOUNTS (post visibility)
-- ============================================================
drop policy if exists "Posts are public by everyone" on public.posts;
drop policy if exists "Posts visible per privacy" on public.posts;
create policy "Posts visible per privacy"
  on public.posts for select
  using (
    not exists (select 1 from public.profiles p where p.id = posts.author_id and p.is_private)
    or posts.author_id = auth.uid()
    or exists (select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = posts.author_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ============================================================
-- [8] CHAT V1 (1:1 direct messages)
-- ============================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0 and char_length(content) <= 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at asc);
create index if not exists participants_user_idx on public.conversation_participants (user_id);

alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Helper: is `p_user` a participant of conversation `p_conv`? SECURITY DEFINER so
-- policies can check membership WITHOUT re-entering conversation_participants
-- RLS (a plain subquery in the policy recurses infinitely).
create or replace function public.is_conversation_participant(p_conv uuid, p_user uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conv and cp.user_id = p_user
  );
$$;

drop policy if exists "Participants see their conversations" on public.conversations;
create policy "Participants see their conversations"
  on public.conversations for select
  using (public.is_conversation_participant(conversations.id, auth.uid()));

drop policy if exists "Participants see conversation members" on public.conversation_participants;
create policy "Participants see conversation members"
  on public.conversation_participants for select
  using (public.is_conversation_participant(conversation_id, auth.uid()));

drop policy if exists "Participants see messages" on public.messages;
create policy "Participants see messages"
  on public.messages for select
  using (public.is_conversation_participant(messages.conversation_id, auth.uid()));

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(messages.conversation_id, auth.uid())
  );

-- NOTE: references can_message_user, defined in section [9]. Plpgsql bodies
-- are validated at CALL time, so creation order does not matter.
create or replace function public.get_or_create_conversation(p_other uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conv uuid;
begin
  -- Private accounts can only be messaged by the owner, their followers, and
  -- admins.
  if not public.can_message_user(p_other) then
    raise exception 'PRIVATE_ACCOUNT_NOT_ALLOWED';
  end if;

  select cp.conversation_id into v_conv
  from public.conversation_participants cp
  where cp.user_id = auth.uid()
    and cp.conversation_id in (
      select cp2.conversation_id from public.conversation_participants cp2
      where cp2.user_id = p_other
    )
    and (select count(*) from public.conversation_participants cp3
         where cp3.conversation_id = cp.conversation_id) = 2
  limit 1;

  if v_conv is null then
    insert into public.conversations default values returning id into v_conv;
    insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, auth.uid()), (v_conv, p_other);
  end if;

  return v_conv;
end;
$$;
