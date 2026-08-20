-- ============================================================
-- KRANTIND UPGRADE — PART 4 of 6
-- post features, discovery topics, chat v2
-- ============================================================
-- HOW TO USE (mobile):
-- 1. Open your Supabase project -> SQL Editor -> New query.
-- 2. Copy ALL of this part, paste it, tap RUN.
-- 3. Wait for it to finish (green 'Success'). Then open a NEW
--    query and paste the NEXT part. Run parts in order 1 -> 6.
-- 4. Every part is safe to re-run if it ever errors.
-- ============================================================
-- events, polls, bookmarks, RSVPs
-- ============================================================
alter table public.posts
  add column if not exists is_pinned boolean not null default false;
alter table public.posts
  add column if not exists updated_at timestamptz;
alter table public.posts
  add column if not exists view_count integer not null default 0;
alter table public.posts
  add column if not exists scheduled_for timestamptz;
alter table public.posts
  add column if not exists event_at timestamptz;
alter table public.posts
  add column if not exists event_location text;
alter table public.posts
  add column if not exists poll_json jsonb;

create table if not exists public.poll_votes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  option_index integer not null check (option_index >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.poll_votes enable row level security;
drop policy if exists "Poll votes are readable" on public.poll_votes;
create policy "Poll votes are readable" on public.poll_votes for select using (true);
drop policy if exists "Users vote on polls" on public.poll_votes;
create policy "Users vote on polls" on public.poll_votes for insert with check (auth.uid() = user_id);

create table if not exists public.post_saves (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.post_saves enable row level security;
drop policy if exists "Saves are readable" on public.post_saves;
create policy "Saves are readable" on public.post_saves for select using (true);
drop policy if exists "Users manage their saves" on public.post_saves;
create policy "Users manage their saves" on public.post_saves for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete their saves" on public.post_saves;
create policy "Users delete their saves" on public.post_saves for delete using (auth.uid() = user_id);

create table if not exists public.post_rsvps (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
alter table public.post_rsvps enable row level security;
drop policy if exists "RSVPs are readable" on public.post_rsvps;
create policy "RSVPs are readable" on public.post_rsvps for select using (true);
drop policy if exists "Users manage their RSVPs" on public.post_rsvps;
create policy "Users manage their RSVPs" on public.post_rsvps for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete their RSVPs" on public.post_rsvps;
create policy "Users delete their RSVPs" on public.post_rsvps for delete using (auth.uid() = user_id);

-- ============================================================
-- [13] DISCOVERY: followed hashtag topics
-- ============================================================
create table if not exists public.followed_topics (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag)
);
alter table public.followed_topics enable row level security;
drop policy if exists "Users read their topics" on public.followed_topics;
create policy "Users read their topics" on public.followed_topics for select using (auth.uid() = user_id);
drop policy if exists "Users add their topics" on public.followed_topics;
create policy "Users add their topics" on public.followed_topics for insert with check (auth.uid() = user_id);
drop policy if exists "Users delete their topics" on public.followed_topics;
create policy "Users delete their topics" on public.followed_topics for delete using (auth.uid() = user_id);

-- ============================================================
-- [14] CHAT V2: groups, attachments, read receipts, typing
-- ============================================================
alter table public.messages
  add column if not exists read_at timestamptz;
alter table public.messages
  add column if not exists attachment_url text;
alter table public.messages
  add column if not exists attachment_type text check (attachment_type in ('photo', 'video'));
alter table public.conversations
  add column if not exists title text;
alter table public.conversations
  add column if not exists is_group boolean not null default false;

create table if not exists public.chat_typing (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table public.chat_typing enable row level security;
drop policy if exists "Participants see typing" on public.chat_typing;
create policy "Participants see typing" on public.chat_typing
  for select using (public.is_conversation_participant(conversation_id, auth.uid()));
drop policy if exists "Users update their typing state" on public.chat_typing;
create policy "Users update their typing state" on public.chat_typing
  for insert with check (auth.uid() = user_id and public.is_conversation_participant(conversation_id, auth.uid()));
drop policy if exists "Users clear their typing state" on public.chat_typing;
create policy "Users clear their typing state" on public.chat_typing
  for update using (auth.uid() = user_id);
drop policy if exists "Users delete their typing state" on public.chat_typing;
create policy "Users delete their typing state" on public.chat_typing
  for delete using (auth.uid() = user_id);

-- Mark incoming messages read + bump my last_read_at (SECURITY DEFINER bypasses
-- RLS so the UPDATE policy on messages doesn't need widening).
create or replace function public.mark_messages_read(p_conversation uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_conversation_participant(p_conversation, auth.uid()) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  update public.messages
    set read_at = now()
    where conversation_id = p_conversation and sender_id <> auth.uid() and read_at is null;
  update public.conversation_participants
    set last_read_at = now()
    where conversation_id = p_conversation and user_id = auth.uid();
end;
$$;

-- Create a group conversation. Creator + at least one other member.
create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conv uuid;
  v_member uuid;
begin
  if p_title is null or char_length(trim(p_title)) = 0 then
    raise exception 'EMPTY_TITLE';
  end if;
  if p_member_ids is null or array_length(p_member_ids, 1) is null or array_length(p_member_ids, 1) < 1 then
    raise exception 'NO_MEMBERS';
  end if;
  insert into public.conversations (title, is_group)
    values (trim(p_title), true) returning id into v_conv;
  insert into public.conversation_participants (conversation_id, user_id)
    values (v_conv, auth.uid());
  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id)
        values (v_conv, v_member);
    end if;
  end loop;
  return v_conv;
end;
$$;

-- Add members to an existing group (any participant can add; PK upserts skip
-- duplicates silently).
create or replace function public.add_group_members(p_conversation uuid, p_member_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member uuid;
  v_is_group boolean;
begin
  if not public.is_conversation_participant(p_conversation, auth.uid()) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  select is_group into v_is_group from public.conversations where id = p_conversation;
  if not coalesce(v_is_group, false) then
    raise exception 'NOT_A_GROUP';
  end if;
  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      insert into public.conversation_participants (conversation_id, user_id)
        values (p_conversation, v_member)
        on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- Realtime for typing + read-state (guarded like section [10]).
do $$
begin
  if exists (select 1 from pg_publication p where p.pubname = 'supabase_realtime') then
    if to_regclass('public.chat_typing') is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'chat_typing'
    ) then
      alter publication supabase_realtime add table public.chat_typing;
    end if;
    if to_regclass('public.conversation_participants') is not null and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = 'conversation_participants'
    ) then
      alter publication supabase_realtime add table public.conversation_participants;
    end if;
  end if;
end $$;
