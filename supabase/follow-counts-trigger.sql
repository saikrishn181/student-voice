-- Keeps profiles.follower_count / following_count in sync with the follows
-- table automatically (insert => +1, delete => -1). Run in the SQL editor.
-- Without this, the counts shown on profiles never change.

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    update public.profiles
      set follower_count = follower_count + 1
      where id = new.following_id;
    update public.profiles
      set following_count = following_count + 1
      where id = new.follower_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.profiles
      set follower_count = greatest(follower_count - 1, 0)
      where id = old.following_id;
    update public.profiles
      set following_count = greatest(following_count - 1, 0)
      where id = old.follower_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists sync_follow_counts on public.follows;
create trigger sync_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();