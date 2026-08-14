# Handoff — Student Voice (continue this project on the tablet)

> Read this file first when starting opencode on a new device. It contains the
> full project context so work can continue without the previous chat history.

## What this app is
Student Voice — a Next.js 15 (App Router, client components) + Supabase app where
students post problems (by Indian state), get support/comments, follow users,
send 1:1 messages, and organizations can get verified. Works on mobile browsers.

## Stack / structure
- Framework: Next.js 15.5, React 19, TypeScript, Tailwind CSS v4, zustand stores
- Auth: Supabase Auth (email/password + Google OAuth), SSR cookie middleware
- Storage: Supabase Storage ONLY (`lib/supabase/storage.ts`, bucket `post-media`).
  Cloudflare R2 was fully removed (do not re-add unless asked; deferred feature)
- State: `lib/store/` — useAuthStore, usePostStore, useUserStore, useChatStore,
  useNotificationStore, useToastStore, useSearchStore
- Components: `components/ui` (base) + `components/feature` (composed)
- SQL: `supabase/schema.sql` (fresh install source of truth) +
  `supabase/upgrade_schema.sql` (idempotent; run this against the live DB)
- Repo: https://github.com/saikrishn181/student-voice.git — branch `main`.
  Origin can also be reached at https://github.com/saikrishn181/student-voice

## Supabase (live project — DO NOT recreate)
- URL: `https://fhgwkrdtljtcjjeselhm.supabase.co`
- Anon key (public by design, RLS protects data; never use service_role in app):
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZ3drcmR0bGp0Y2pqZXNlbGhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NzQ0MjcsImV4cCI6MjEwMTI1MDQyN30.iDyKcHL_QJvEFkR9prCP2uSeZlKcD52QrnBqYCkX_JM`
- `.env.local` must contain exactly these two keys:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://fhgwkrdtljtcjjeselhm.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<the key above>
  ```
  Same two values are set on Vercel (Key/Value) — keep them in sync.
- To verify the DB from code (e.g. debugging): REST GET
  `https://fhgwkrdtljtcjjeselhm.supabase.co/rest/v1/<table>?select=*&limit=1`
  with headers `apikey: <anon>` and `Authorization: Bearer <anon>`.
  (Watch out: in Windows PowerShell `$table?` parses `?` into the variable name.)

## Git workflow (two devices — IMPORTANT)
- Git is the source of truth. ALWAYS `git push` before switching devices and
  `git pull` before starting work on the other device.
- Vercel auto-deploys every push to `main` (~1–2 min). No manual deploy needed.
- Never commit secrets. `.env.local` is gitignored; recreate it from this file.

## Feature status (all on main, deployed to Vercel)
- Posts feed (realtime), supports, comments (add/edit/delete), report, block,
  admin verification page, search with filters, notifications
- Password login/signup + Google OAuth + forgot password (email OTP tab)
- One-time onboarding `/onboarding/profile`: shown after fresh signup / first
  Google sign-in (name pre-filled from Google, state, student/org, private
  toggle for students, optional bio). Returning users skip it (auth callback
  redirects to /feed once state is set). Old `/onboarding/region` was deleted.
- Private accounts (students): `profiles.is_private` + posts RLS policy
  "Posts visible per privacy"; toggle in EditProfileModal (student only)
- Public profiles `/profile/[id]`: clicking a post author's name/avatar opens
  it. Public: everything + Message. Private + not followed: only dp/name/bio/
  stats (via `get_profile_stats` RPC) + "Follow request" flow
- Follow requests: `follow_requests` table + triggers; Accept/Reject UI on own
  profile; accepting auto-inserts the follow; notification type `follow_request`
- Followers/Following list modal (`FollowersModal`) — tap counts on any profile
- Chat: 1:1 conversations, `conversations`/`conversation_participants`/`messages`
  tables, `get_or_create_conversation` RPC, realtime, `/messages` +
  `/messages/[id]`, Messages tab in navbar, "Send message" in PostCard menu.
  Private accounts can only be messaged by the owner/followers/admins
  (`can_message_user` + `PRIVATE_ACCOUNT_NOT_ALLOWED` exception)

## PENDING / DO THIS NEXT
1. **DB upgrade**: re-run `supabase/upgrade_schema.sql` in the Supabase SQL
   editor if it hasn't been done since commit 25f8dd5 — it fixes the chat RLS
   infinite recursion (`is_conversation_participant` helper). Verify chat works.
   The script is idempotent (drop policy if exists + create, if not exists etc.).
2. Verify on live site: private profile flow, follow requests, chat, Google
   one-time onboarding, followers modal.
3. Deferred (user reminder): Cloudflare R2 image storage "later".
4. Test command baseline: `npx tsc --noEmit` clean, `npm test` 5/5,
   `npm run build` passes. Run these after every feature before pushing.

## Testing / running
- Dev: `npm run dev` (needs `.env.local` — see above)
- Verify: `npx tsc --noEmit`, `npm test` (node --test tests/*.test.ts), `npm run build`
- Before pushing: commit + push every completed unit so the other device is in sync.

## Supabase DB current state (known-good after last upgrade run)
- profiles (has is_private), posts, comments, follows, blocks, reports,
  notifications, conversations, conversation_participants, messages,
  follow_requests all exist. RLS is per-table.
- Post-25f8dd5: chat policies now use `is_conversation_participant` (security
  definer) to avoid recursion — applied to the live DB by re-running the script.
- Storage bucket: `post-media` (public read).
