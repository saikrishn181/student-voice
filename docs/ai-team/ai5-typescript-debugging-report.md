# Type Safety Audit Report

## 1. Type Safety Summary

**Files Audited:** `lib/types.ts` (inferred from usage), `lib/mappers.ts`, `app/error.tsx`

| File | Risk Level | Primary Issues |
|------|-----------|----------------|
| `lib/mappers.ts` | 🔴 High | Unsafe casts, undefined dereference, type assertions bypass checks |
| `app/error.tsx` | 🟡 Medium | Unguarded `window` access, locale-formatted `<pre>`, missing `digest` typing in TS 5.x |
| `lib/types.ts` (implied) | 🔴 High | `mediaType`, `poll`, `contentWarning` likely too strict/wrongly optional |

---

## 2. Type Mismatches & Runtime Hazards

### 🔴 `lib/mappers.ts`

**Hazard 1 — Unsafe `as` cast on `poll_json`**
```typescript
const rawPoll = row.poll_json as { ... } | null  // ❌ silent trust
```
If the column is `unknown` / `Json` in the DB driver, the cast lies to the compiler. A malformed row (e.g. `poll_json = "abc"` from a bad migration) will pass type-checking and throw `Cannot read 'options' of string` at runtime.

**Hazard 2 — `categoryFromHashtags` invoked on potentially-null `row.hashtags`**
```typescript
row.category ?? categoryFromHashtags(row.hashtags ?? [])
```
The `?? []` rescues the call, but `row.hashtags` is typed as `string[]` (not nullable) elsewhere in usage — meaning `?? []` is either dead code (lying) or masking a real nullable mismatch with the row type.

**Hazard 3 — `Boolean()` coercion on possibly-undefined columns**
```typescript
isAnonymous: Boolean(row.is_anonymous)
```
In Postgres, nullable booleans return `boolean | null`. `Boolean(null) === false` — so a NULL becomes a domain-truthy `false` instead of being distinguished as "unknown". Same problem for `is_followers_only`, `friends_also`, `is_resolved`.

**Hazard 4 — Date fields returned as `string | undefined`**
```typescript
createdAt: row.created_at
```
If the row type declares `created_at: Date`, you store a `Date` into a `Post.createdAt: string` field — silent type error. Conversely if `created_at: string`, you ship unvalidated strings downstream.

**Hazard 5 — `mediaType` cast bypasses enum check**
```typescript
mediaType: (row.media_type as Post['mediaType']) ?? null
```
If `media_type` is `'video/quicktime'` or a typo, the cast accepts it. No runtime narrowing.

---

### 🟡 `app/error.tsx`

**Hazard 6 — `window.location.href` access in a component that may be SSR-rendered during streaming**
Next.js App Router error boundaries *can* be rendered on the server during initial error streaming. Guarding with `typeof window` is mandatory.

**Hazard 7 — `error.digest` type**
In `next@14+` the `error` prop is typed as `Error & { digest?: string }` — correct in your code. ✅ However, if you upgrade to React 19 RC builds or use a typed wrapper, `digest` may become `string | undefined` and template-literal rendering of `undefined` produces the literal string `"undefined"`. Your ternary already handles this — but the `pre` interpolation `${error.message}\n\n...` is JSX text + expression, which renders `\n` as the literal two characters in HTML, not a newline. This is a UI bug, not a type bug, but worth flagging.

**Hazard 8 — No `error.tsx` boundary for `global-error.tsx` complement**
You show `error.tsx` but the question asks about state recovery. Resetting via `reset()` re-runs the segment; if the underlying error is in a server component's data fetch, `reset()` won't help. The user gets stuck.

---

## 3. Corrected Type Definitions & Code

### `lib/types.ts` (corrected)

```typescript
// Discriminated by truthiness — anonymous authors get `null`, not optional
export interface AuthorRef {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
}

export type MediaType = 'image' | 'video' | 'gif' | 'audio' | null

export interface Poll {
  question: string
  options: string[]
  endsAt?: string // ISO-8601, optional → "open-ended poll" is valid
}

export interface Post {
  id: string
  // Anonymous posts: author is intentionally null, not undefined
  author: AuthorRef | null
  authorId: string | null // null when isAnonymous
  text: string
  mediaUrl: string | null
  mediaType: MediaType
  mediaAspectRatio: number | null

  state: string
  category: string
  hashtags: string[]

  supportCount: number
  commentCount: number
  viewCount: number
  createdAt: string // ISO string, validated on the server
  editedAt?: string

  scheduledFor?: string
  eventAt?: string
  eventLocation?: string

  poll: Poll | null // null = no poll attached
  contentWarning?: string // omitted entirely when no CW
  isAnonymous: boolean
  isFollowersOnly: boolean
  friendsAlso: boolean
  isResolved: boolean
  resolvedAt?: string
  resolutionNote?: string

  // Per-viewer booleans, always boolean (never nullable)
  supportedByCurrentUser: boolean
  savedByCurrentUser: boolean

  isPinned: boolean
}

// Row from DB driver — reflects actual nullability
export interface PostRow {
  id: string
  author_id: string | null
  text: string
  media_url: string | null
  media_type: string | null          // raw, untrusted
  media_aspect_ratio: number | null
  state: string | null
  category: string | null
  hashtags: string[] | null
  support_count: number
  comment_count: number
  view_count: number
  created_at: string
  updated_at: string | null
  is_pinned: boolean
  scheduled_for: string | null
  event_at: string | null
  event_location: string | null
  poll_json: unknown                  // ← untrusted JSON
  content_warning: string | null
  is_anonymous: boolean | null
  is_followers_only: boolean | null
  friends_also: boolean | null
  is_resolved: boolean | null
  resolved_at: string | null
  resolution_note: string | null
}
```

### `lib/mappers.ts` (corrected)

```typescript
const ALLOWED_MEDIA = new Set<NonNullable<MediaType>>(['image', 'video', 'gif', 'audio'])

function normalizeMediaType(raw: string | null): MediaType {
  if (raw === null) return null
  return (ALLOWED_MEDIA.has(raw as NonNullable<MediaType>) ? (raw as MediaType) : null)
}

function parsePoll(raw: unknown): Poll | null {
  if (raw === null || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const options = Array.isArray(r.options)
    ? r.options.filter((o): o is string => typeof o === 'string')
    : []
  if (options.length === 0) return null
  return {
    question: typeof r.question === 'string' ? r.question : '',
    options,
    endsAt: typeof r.ends_at === 'string' ? r.ends_at : undefined,
  }
}

export function rowToPost(row: PostRow): Post {
  const poll = parsePoll(row.poll_json)

  return {
    id: row.id,
    authorId: row.author_id,
    // Resolve author at the call site, where you have JOIN data — don't fake it here
    author: null,
    text: row.text,
    mediaUrl: row.media_url,
    mediaType: normalizeMediaType(row.media_type),
    mediaAspectRatio: row.media_aspect_ratio,
    state: row.state ?? '',
    category: row.category ?? categoryFromHashtags(row.hashtags ?? []),
    hashtags: row.hashtags ?? [],
    supportCount: row.support_count,
    commentCount: row.comment_count,
    viewCount: row.view_count,
    createdAt: row.created_at,
    editedAt: row.updated_at ?? undefined,
    isPinned: row.is_pinned,
    scheduledFor: row.scheduled_for ?? undefined,
    eventAt: row.event_at ?? undefined,
    eventLocation: row.event_location ?? undefined,
    poll,
    contentWarning: row.content_warning ?? undefined,
    // Tri-state: explicit null only if your domain distinguishes "explicitly false" vs "unknown"
    // For boolean intent, default false on NULL is acceptable — but document it:
    isAnonymous: row.is_anonymous ?? false,
    isFollowersOnly: row.is_followers_only ?? false,
    friendsAlso: row.friends_also ?? false,
    isResolved: row.is_resolved ?? false,
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    supportedByCurrentUser: false,
    savedByCurrentUser: false,
  }
}
```

### `app/error.tsx` (corrected)

```typescript
'use client'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type RouteErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorBoundary({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    // Surface to your telemetry sink — console.error alone is lossy
    console.error('Route error:', { message: error.message, digest: error.digest, stack: error.stack })
  }, [error])

  const goHome = () => {
    if (typeof window !== 'undefined') window.location.href = '/feed'
  }

  return (
    <div className='flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 text-center'>
      <span className='mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-red-100 text-red-600'>
        <AlertTriangle size={28} />
      </span>
      <h1 className='text-h2 text-slate-900'>Something went wrong</h1>
      <p className='mt-2 max-w-sm text-body-sm text-slate-500'>
        An unexpected error occurred while loading this page. Please try again.
      </p>

      {/* Preserve newlines + safely render optional digest */}
      <pre className='mt-4 max-w-full overflow-auto rounded-card bg-slate-900 p-4 text-left text-xs text-red-300 whitespace-pre-wrap'>
        {error.message}
        {error.digest ? `\n\ndigest: ${error.digest}` : ''}
      </pre>

      <div className='mt-6 flex items-center gap-3'>
        <Button onClick={reset}>Try again</Button>
        <Button variant='outline' onClick={goHome}>Back to Feed</Button>
      </div>
    </div>
  )
}
```

### `app/global-error.tsx` (new, recommended)

```typescript
'use client'
// Required because `error.tsx` is wrapped in the root layout — if the layout itself throws,
// only `global-error.tsx` catches it. It must include <html><body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang='en'>
      <body className='bg-slate-50'>
        <div className='flex min-h-dvh flex-col items-center justify-center px-4 text-center'>
          <h1 className='text-h2 text-slate-900'>Application error</h1>
          <p className='mt-2 text-body-sm text-slate-500'>
            A fatal error occurred. Your session data is preserved — reloading will restore your state.
          </p>
          <button
            className='mt-6 rounded-card bg-red-600 px-4 py-2 text-white'
            onClick={() => {
              if (typeof window !== 'undefined') {
                // Hard reload preserves the *server* but loses client state — call this out in the UI
                window.location.reload()
              }
              reset()
            }}
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  )
}
```

---

## 4. Error Recovery Strategy

| Layer | Recovery mechanism | State preservation |
|-------|--------------------|--------------------|
| Server component throws | `error.tsx` catches → `reset()` re-runs the segment | ✅ Client component state in segment retained |
| Root layout throws | `global-error.tsx` catches → only option is hard reload | ⚠️ Loses client state; **document this in copy** |
| Client component throws | React error boundary → bubbles to nearest `error.tsx` | ✅ Local state lost; route state preserved |
| Mapper throws (bad DB row) | `parsePoll` / `normalizeMediaType` return safe defaults | ✅ Never throws on bad data |
| Anonymous author resolution | `author: null` returned, UI branches on `isAnonymous` | ✅ No "ghost author" crash |

**Key principle:** A user must never see a blank screen or an unstyled error. Every error boundary above renders styled fallback UI and offers either a soft reset (`reset()`) or a hard escape (route to `/feed` / reload). Hard-reload flows should explicitly tell the user their data is safe on the server.

**Recommendation:** Add a Sentry (or equivalent) capture in both error boundaries' `useEffect` — `console.error` is invisible in production. The audit above fixes the type and runtime safety; observability is the missing third pillar.
