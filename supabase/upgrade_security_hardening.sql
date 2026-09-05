-- ==============================================================================
-- Krantind Security Hardening Migration
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. STORAGE SECURITY: Restrict post-media update and delete to object owner & admins
drop policy if exists "post-media: public update" on storage.objects;
drop policy if exists "post-media: authenticated update" on storage.objects;
create policy "post-media: authenticated update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'post-media'
    and (owner = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  );

drop policy if exists "post-media: public delete" on storage.objects;
drop policy if exists "post-media: authenticated delete" on storage.objects;
create policy "post-media: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and (owner = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  );

-- 2. PROFILE SECURITY: Prevent privilege escalation, fake verification & follower tampering
create or replace function public.guard_profile_updates()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    new.is_admin := old.is_admin;
    new.is_banned := old.is_banned;
    new.banned_until := old.banned_until;
    new.ban_reason := old.ban_reason;
    new.strike_count := old.strike_count;
    new.verification_status := old.verification_status;
    new.college_verified := old.college_verified;
    new.college_name := old.college_name;
    new.college_email := old.college_email;
  end if;

  new.follower_count := old.follower_count;
  new.following_count := old.following_count;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_updates on public.profiles;
create trigger trg_guard_profile_updates
  before update on public.profiles
  for each row execute function public.guard_profile_updates();

-- 3. POST SECURITY: Metrics integrity, author protection, and banned user blocking
create or replace function public.guard_post_inserts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.support_count := 0;
  new.comment_count := 0;
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    new.is_pinned := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_post_inserts on public.posts;
create trigger trg_guard_post_inserts
  before insert on public.posts
  for each row execute function public.guard_post_inserts();

create or replace function public.guard_post_updates()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.author_id := old.author_id;
  new.support_count := old.support_count;
  new.comment_count := old.comment_count;
  new.created_at := old.created_at;

  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    new.is_pinned := old.is_pinned;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_post_updates on public.posts;
create trigger trg_guard_post_updates
  before update on public.posts
  for each row execute function public.guard_post_updates();

drop policy if exists "Users can create posts" on public.posts;
create policy "Users can create posts"
  on public.posts for insert
  with check (
    auth.uid() = author_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
  on public.posts for update
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- 4. PRIVATE ACCOUNT PROTECTION: Prevent direct follow insertion bypass
create or replace function public.guard_follow_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_is_private boolean;
begin
  if new.follower_id = new.following_id then
    raise exception 'CANNOT_FOLLOW_SELF';
  end if;

  select is_private into v_is_private from public.profiles where id = new.following_id;
  if coalesce(v_is_private, false) = true then
    if not exists (
      select 1 from public.follow_requests
      where requester_id = new.follower_id
        and target_id = new.following_id
        and status = 'accepted'
    ) and not exists (
      select 1 from public.profiles where id = auth.uid() and is_admin = true
    ) then
      raise exception 'TARGET_IS_PRIVATE_REQUEST_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_follow_insert on public.follows;
create trigger trg_guard_follow_insert
  before insert on public.follows
  for each row execute function public.guard_follow_insert();

drop policy if exists "Users can follow others" on public.follows;
create policy "Users can follow others"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

-- 5. COMMENTS SECURITY: Prevent comment reading and posting on followers-only posts by non-followers
drop policy if exists "Comments are public" on public.comments;
drop policy if exists "Comments are visible to post viewers" on public.comments;
create policy "Comments are visible to post viewers"
  on public.comments for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and (
          p.is_followers_only is not true
          or p.author_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = p.author_id
          )
          or exists (
            select 1 from public.profiles pr
            where pr.id = auth.uid() and pr.is_admin
          )
        )
    )
  );

drop policy if exists "Users can comment" on public.comments;
drop policy if exists "Users can comment on visible posts" on public.comments;
create policy "Users can comment on visible posts"
  on public.comments for insert
  with check (
    auth.uid() = author_id
    and not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true
    )
    and exists (
      select 1 from public.posts p
      where p.id = comments.post_id
        and (
          p.is_followers_only is not true
          or p.author_id = auth.uid()
          or exists (
            select 1 from public.follows f
            where f.follower_id = auth.uid() and f.following_id = p.author_id
          )
          or exists (
            select 1 from public.profiles pr
            where pr.id = auth.uid() and pr.is_admin
          )
        )
    )
  );

-- 6. BAN ENFORCEMENT ON ENGAGEMENT (Supports, Polls, Chat)
drop policy if exists "Users can support posts" on public.post_supports;
create policy "Users can support posts"
  on public.post_supports for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

drop policy if exists "Users vote on polls" on public.poll_votes;
create policy "Users vote on polls"
  on public.poll_votes for insert
  with check (
    auth.uid() = user_id
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true)
  );

drop policy if exists "Participants send messages" on public.messages;
create policy "Participants send messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(messages.conversation_id, auth.uid())
    and not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true
    )
  );

-- 7. CHAT HARASSMENT & BLOCK ENFORCEMENT
create or replace function public.can_message_user(p_other uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() = p_other then
    return true;
  end if;

  if exists (
    select 1 from public.blocks
    where (blocker_id = p_other and blocked_id = auth.uid())
       or (blocker_id = auth.uid() and blocked_id = p_other)
  ) then
    return false;
  end if;

  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true) then
    return false;
  end if;

  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    return true;
  end if;

  if exists (select 1 from public.profiles p where p.id = p_other and not p.is_private) then
    return true;
  end if;

  if exists (select 1 from public.follows f
             where f.follower_id = auth.uid() and f.following_id = p_other) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.create_group_conversation(p_title text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_conv uuid;
  v_member uuid;
begin
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true) then
    raise exception 'USER_IS_BANNED';
  end if;
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
      if not exists (
        select 1 from public.blocks
        where (blocker_id = v_member and blocked_id = auth.uid())
           or (blocker_id = auth.uid() and blocked_id = v_member)
      ) then
        insert into public.conversation_participants (conversation_id, user_id)
          values (v_conv, v_member);
      end if;
    end if;
  end loop;
  return v_conv;
end;
$$;

create or replace function public.add_group_members(p_conversation uuid, p_member_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_member uuid;
  v_is_group boolean;
begin
  if exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_banned = true) then
    raise exception 'USER_IS_BANNED';
  end if;
  if not public.is_conversation_participant(p_conversation, auth.uid()) then
    raise exception 'NOT_A_PARTICIPANT';
  end if;
  select is_group into v_is_group from public.conversations where id = p_conversation;
  if not coalesce(v_is_group, false) then
    raise exception 'NOT_A_GROUP';
  end if;
  foreach v_member in array p_member_ids loop
    if v_member <> auth.uid() then
      if not exists (
        select 1 from public.blocks
        where (blocker_id = v_member and blocked_id = auth.uid())
           or (blocker_id = auth.uid() and blocked_id = v_member)
      ) then
        insert into public.conversation_participants (conversation_id, user_id)
          values (p_conversation, v_member)
          on conflict do nothing;
      end if;
    end if;
  end loop;
end;
$$;

-- 8. ANONYMOUS PRIVACY: Mask anonymous posts from public profile stats
create or replace function public.get_profile_stats(p_user uuid)
returns table (posts_count bigint, follower_count bigint, following_count bigint)
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  select
    (
      select count(*) from public.posts
      where author_id = p_user
        and (
          is_anonymous is not true
          or author_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
        )
    )::bigint,
    (select count(*) from public.follows where following_id = p_user)::bigint,
    (select count(*) from public.follows where follower_id = p_user)::bigint;
end;
$$;
