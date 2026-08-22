-- ============================================================
-- KRANTIND — PART 7/7 (run after parts 1-6; idempotent)
-- CHAT: unsend / delete own messages
-- ============================================================

-- Senders can remove their own messages ("unsend"). The app removes the row
-- from the conversation for everyone; other participants see it disappear
-- live via realtime (messages is already in the realtime publication).
drop policy if exists "Senders delete their messages" on public.messages;
create policy "Senders delete their messages"
  on public.messages for delete
  using (auth.uid() = sender_id);

drop policy if exists "Senders update their messages" on public.messages;
create policy "Senders update their messages"
  on public.messages for update
  using (auth.uid() = sender_id);