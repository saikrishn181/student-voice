# Krantind (Student Voice)

Krantind is an advocacy platform built for Indian college students to raise campus issues — mess food hygiene, hostel facilities, fee hikes, exam delays, and harassment — and get support from local student unions and peers.

Live Domain: [krantind.xyz](https://krantind.xyz)

## Architecture Overview

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **State**: Zustand stores (`lib/store/`)
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, Realtime, Storage)
- **Styling**: Tailwind CSS + custom design primitives (`components/ui/`)

## Key Platform Features

- **Whistleblower Anonymous Mode**: Students can post anonymously (`Anonymous Student • [College]`) to voice grievances without fear of college management rustication or retaliation.
- **Campus Surge Heatmap**: Velocity algorithm in `lib/heatmap.ts` detects issue spikes across multiple colleges within 48 hours.
- **Moderation Engine**: Custom YCbCr pixel analysis (`lib/moderation.ts`) for NSFW scanning, Indian regional slang moderation (Telugu, Tamil, Marathi, Hindi), and 10-strike ban escalation.
- **Grievance Appellate Committee (GAC)**: Statutory compliance integration under Rule 3A of Indian IT Rules 2021.

## Local Setup

```bash
git clone https://github.com/saikrishn181/student-voice.git
cd student-voice
npm install
```

Configure `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Run database migrations from `supabase/schema.sql`, then start dev server:
```bash
npm run dev
```

Run automated tests:
```bash
npm test
```
