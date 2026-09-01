# Krantind

> **India's Student Voice Platform** — Where campus problems become campus solutions.

**Live at [krantind.xyz](https://krantind.xyz)**

Krantind is a community platform where students and student organizations across India post the problems that matter on campus — and get real support from the people closest to them. No noise, just genuine help where you live.

---

## Features

### Core
- **Voice it** — Post campus problems (academics, fees, harassment, mental health, exams, placements) with optional photos or videos, anchored to your state.
- **Get support** — Students and verified organizations support, comment on, and step in to help with your posts.
- **Local-first feed** — The feed surfaces problems from your state first, so help comes from nearby.
- **Follow organizations** — Stay updated on what student unions, NGOs, and campus clubs are doing.
- **Real-time notifications** — Updates when someone supports, comments on, or follows your work.
- **One-tap sign in** — Email/password or Google OAuth login.
- **Direct messages** — Private 1:1 and group chats between students and organizations.
- **Double-tap to like** — Instagram-style heart animation with haptic feedback.

### Smart Algorithms
- **Personalized "For You" Feed** — AI-powered recommendation engine that learns your topic/college/category affinities from interactions (supports, comments, saves, views) and ranks posts by personalized relevance score.
- **Campus Heatmap / Hot Issues Velocity Score** — Detects when a specific campus issue (e.g. Hostel Mess, Fee Hike) suddenly receives a surge of posts within 48 hours across multiple colleges. Surfaces a Breaking Campus Issue banner with tiered severity (Rising → Hot → Breaking).

### Content Moderation & Safety
- **Automated NSFW Detection** — Multi-layer content moderation engine with leetspeak normalization, profanity/hate speech/harassment detection (English + Hindi/Indian slang), and spam filtering.
- **Computer Vision Image Scanner** — Client-side pixel analysis using YCbCr skin chrominance detection to automatically flag explicit visual uploads.
- **18+ NSFW Toggle** — Users can self-tag sensitive content with a blur overlay; self-tagged posts are preserved without penalty.
- **Smart Blur vs Delete** — Partial NSFW on trending/important topics gets auto-blurred (no strike); full NSFW gets auto-deleted with a strike.
- **10-Strike Ban System** — Progressive enforcement: warnings → 24h restriction → 7-day suspension → permanent ban.
- **In-App Moderation Notifications** — Users receive styled notifications when their posts are blurred (amber) or removed (red), with strike count and reason details.
- **Private chats unmoderated** — DMs are private; moderation applies only to public posts.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS — custom design system in `components/ui` |
| **State** | Zustand — client state stores backed by Supabase |
| **Backend** | Supabase — PostgreSQL (profiles, posts, comments, follows, notifications, supports), Storage (post media & avatars), Auth (email/password + Google OAuth), Realtime |
| **Deployment** | Vercel (auto-deploy on push to `main`) |
| **Domain** | [krantind.xyz](https://krantind.xyz) |

---

## Getting Started

1. **Clone and install:**

   ```bash
   git clone https://github.com/saikrishn181/student-voice.git
   cd student-voice
   npm install
   ```

2. **Create `.env.local`** with your Supabase project keys:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   ```

3. **Set up the database:** Open the Supabase SQL Editor and run `supabase/schema.sql`, then the upgrade scripts under `supabase/` (see each file's header comment for order and prerequisites).

4. **Run the app:**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

5. **Run tests:**

   ```bash
   npm test
   ```

---

## Project Structure

```
app/                 Pages & routes (feed, post, profile, search, notifications, messages, auth)
components/ui/       Design system: Button, Input, Select, Card, Modal, Tabs, etc.
components/feature/  Feature components: PostCard, CommentThread, MediaUploader, HotIssueBanner…
lib/store/           Zustand stores (auth, posts, users, notifications, chat, toast)
lib/                 Core modules: recommendation.ts, heatmap.ts, moderation.ts, notifications.ts
lib/supabase/        Supabase clients (browser, server, storage helpers)
constants/           States list, categories, organization types, page-size settings
supabase/            SQL schema, triggers, migrations, seed scripts
tests/               Unit tests (moderation, heatmap, recommendation, utils)
```

---

## License

MIT

---

<p align="center">
  Built for Indian students by <strong>Krantind</strong>
</p>
