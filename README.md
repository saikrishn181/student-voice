# Student Voice

StudentVoice is a community platform where students and student organizations across India post the problems that matter on campus — and get real support from the people closest to them. No noise, just genuine help where you live.

## Features

- **Voice it** — Post campus problems (academics, fees, harassment, mental health, exams, placements) with optional photos or videos, anchored to your state.
- **Get support** — Students and verified organizations support, comment on, and step in to help with your posts.
- **Local-first** — The feed surfaces problems from your state first, so help comes from nearby.
- **Follow organizations** — Stay updated on what student unions, NGOs, and campus clubs are doing.
- **Notifications** — Real-time updates when someone supports, comments on, or follows your work.
- **One-tap sign in** — Email/password or Google login.

## Tech Stack

- **Next.js 15** (App Router) + React 19 + TypeScript
- **Tailwind CSS** — custom design system in `components/ui`
- **Zustand** — client state stores backed by Supabase
- **Supabase** — PostgreSQL (profiles, posts, comments, follows, notifications, supports), Storage (post media & avatars), and Auth (email/password + Google OAuth)

## Getting Started

1. Clone and install:

   ```bash
   npm install
   ```

2. Create `.env.local` with your Supabase project keys:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. Set up the database: open the Supabase SQL Editor and run `supabase/schema.sql`, then the other scripts under `supabase/` (see each file's header comment for order and prerequisites).

4. Run the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Project Structure

```
app/                 Pages & routes (feed, post, profile, search, notifications, auth)
components/ui/       Design system: Button, Input, Select, Card, Modal, Tabs, etc.
components/feature/  Feature components: PostCard, CommentThread, MediaUploader, EditProfileModal…
lib/store/           Zustand stores (auth, posts, users, notifications, toast)
lib/supabase/        Supabase clients (browser, server, storage helpers)
constants/           States list, categories, organization types, page-size settings
supabase/            SQL schema, triggers, seed scripts
```
