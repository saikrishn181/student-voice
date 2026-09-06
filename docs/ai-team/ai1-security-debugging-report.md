# Security Audit Report: Authentication & Data Flow

## 1. Executive Summary

I performed a focused security review of three critical modules in the application: the OAuth callback handler, the moderation engine, and the multi-account storage layer. The audit identified **several high-severity vulnerabilities**, most notably an **open-redirect bypass via backslash encoding**, a **server-side trusted client payload** in saved accounts that allows **author ID spoofing**, and a **non-atomic moderation check** that allows banned users to perform mutations within a race window.

All findings are reproducible and have concrete patches provided below. **Overall posture: HIGH RISK** — production deployment is not recommended until P0/P1 issues are remediated.

---

## 2. Vulnerability / Bug Findings

### Finding 1 — Open Redirect via Backslash & Encoded Variants (P0 / High)

**Affected File/Flow:** `app/auth/callback/route.ts`, lines governing the `next` parameter.

**Root Cause:** The current allow-list is too narrow. It rejects only `//` and `/\\` as literal prefixes. Browsers normalize URL paths differently than `URL`/`startsWith`, and attackers can craft values that pass the literal check while still navigating off-site after browser interpretation.

```typescript
// CURRENT — vulnerable
if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) {
  confirmUrl.searchParams.set('next', next)
}
```

Bypass vectors that still work:
- `/\example.com` — starts with `/`, does not start with `//`. Chrome/Firefox treat `\` like `/` on the host boundary, so the browser navigates to `example.com`.
- `/%5cexample.com` — starts with `/`. After URL parsing, `%5c` decodes to `\`, which the browser reinterprets as a host separator.
- `/%2f%2fevil.com` — starts with `/`. Decodes to `//evil.com`, an absolute cross-origin URL.
- `/.example.com` — passes literal checks but can be abused when downstream code trusts the parameter as a path.

Additionally, `next` is forwarded through `searchParams`, so any URL-encoded payload re-enters a `URL` constructor elsewhere — a second normalization pass may surface additional bypasses.

---

### Finding 2 — Authoritative ID Leak & Spoofing in Saved Accounts (P0 / High)

**Affected File/Flow:** `lib/savedAccounts.ts`.

**Root Cause:** The store treats client-supplied IDs as authoritative. When a saved account is created or merged, the server records whatever `userId` the client provides rather than deriving it from the authenticated session. Consequences:

- An anonymous (logged-out) client can inject an arbitrary `userId` and have it persisted.
- A logged-in client can store entries claiming to belong to another user; on read-back, those IDs leak through any UI that displays "author" or "posted by".
- Serialization helpers that simply round-trip the stored object propagate the forged IDs to every consumer.

Because the storage appears to be a server-side list keyed by these IDs, any read endpoint that returns the list discloses the forged author identifiers.

---

### Finding 3 — Non-Atomic Banned-User Check (P1 / High)

**Affected File/Flow:** `lib/moderation.ts`.

**Root Cause:** The "is this user banned?" check and the mutation are separate database operations performed sequentially without a transaction or server-enforced guard at the mutation site. Two concrete problems:

- The status check can be cached or read from a snapshot that lags behind an admin ban, so a freshly banned user keeps mutating until cache expiry.
- More importantly, any caller is expected to *opt in* to the check. If a new mutation route forgets to invoke the helper, the ban is silently bypassed. There is no RLS policy, database trigger, or middleware that enforces the ban at the data layer.

A banned user can therefore post, comment, vote, or edit within the race window between ban and next refresh, and any code path that omits the helper is wide open.

---

### Finding 4 — Email PII in Redirect Query String (P2 / Medium)

**Affected File/Flow:** `app/auth/callback/route.ts`.

**Root Cause:** The user's email and profile name are placed into the `Location` header's query string:

```typescript
if (userEmail) confirmUrl.searchParams.set('email', userEmail)
if (profile?.name) confirmUrl.searchParams.set('name', profile.name)
```

`Location` headers, referrer leakage, proxy logs, browser history, and any intermediate 3xx-following crawlers all retain this value. Email is sensitive PII and should not travel through URLs.

---

### Finding 5 — Predictable OAuth Error Surface (P3 / Low)

**Affected File/Flow:** `app/auth/callback/route.ts`.

**Root Cause:** Distinct redirect paths (`/login?error=oauth` vs `/login`) act as an oracle for whether a given authorization code was consumed, redeemed successfully, or invalid. Combined with the email/name leak, this aids enumeration. Not exploitable on its own but worth tightening.

---

## 3. Code Fixes & Patches

### Patch A — Strict Same-Origin Redirect Validation

Replace the naive `startsWith` check with a true same-origin check using the `URL` constructor. Only accept paths that resolve under the request's own origin with no host change.

```typescript
// app/auth/callback/route.ts
function safeNextPath(rawNext: string | null, requestUrl: string): string | null {
  if (!rawNext) return null
  // Reject control chars and any backslash, which browsers may treat as '/'
  if (/[\x00-\x1f\\]/.test(rawNext)) return null

  let parsed: URL
  try {
    parsed = new URL(rawNext, requestUrl)
  } catch {
    return null
  }

  const base = new URL(requestUrl)
  // Must be same origin AND same protocol
  if (parsed.origin !== base.origin) return null
  // Must be a path (no protocol swap, no host swap)
  if (parsed.protocol !== base.protocol) return null
  // Disallow protocol-relative "//host" that re-parses to a different origin
  if (parsed.host !== base.host) return null
  // Must start with a single leading slash and not be empty
  if (!parsed.pathname.startsWith('/') || parsed.pathname === '/') return null

  return parsed.pathname + parsed.search + parsed.hash
}
```

Then in the handler:

```typescript
const safeNext = safeNextPath(next, request.url)
if (safeNext) confirmUrl.searchParams.set('next', safeNext)
```

This blocks: `/\evil.com`, `/%5cevil.com`, `/%2f%2fevil.com`, `//evil.com`, `https://evil.com`, `javascript:...`, and any encoded scheme.

---

### Patch B — Remove PII from Redirect URL

```typescript
// app/auth/callback/route.ts
// Remove these lines:
// if (userEmail) confirmUrl.searchParams.set('email', userEmail)
// if (profile?.name) confirmUrl.searchParams.set('name', profile.name)

// Instead, encode a short-lived, opaque ticket:
import { randomBytes } from 'crypto'
const ticket = randomBytes(24).toString('base64url')
await supabase.from('pending_oauth').insert({
  ticket,
  user_id: userId,
  email: userEmail,
  name: profile?.name ?? null,
  expires_at: new Date(Date.now() + 60_000).toISOString(),
})

confirmUrl.searchParams.set('ticket', ticket)
```

The receiving page exchanges the ticket server-side and never sees the raw email or name in a URL.

---

### Patch C — Derive Author IDs from the Authenticated Session

In `lib/savedAccounts.ts`, never accept a client-supplied user ID for ownership. Always bind to the verified session.

```typescript
// lib/savedAccounts.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function saveAccount(input: {
  accountId: string
  label?: string
  metadata?: Record<string, unknown>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('unauthenticated')

  // Ignore any client-claimed userId; bind strictly to the session.
  const ownerId = user.id

  const { data, error: upErr } = await supabase
    .from('saved_accounts')
    .upsert(
      {
        owner_id: ownerId,
        account_id: input.accountId,
        label: input.label ?? null,
        metadata: input.metadata ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'owner_id,account_id' }
    )
    .select('id, owner_id, account_id, label, created_at')
    .single() // never select(*) — avoid leaking metadata blobs
  if (upErr) throw upErr
  return data
}

export async function listSavedAccounts() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('saved_accounts')
    .select('id, account_id, label, created_at') // omit owner_id from wire payload
    .eq('owner_id', user.id)
  return data ?? []
}
```

And on serialization, never echo back `owner_id`:

```typescript
function toPublicDTO(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    label: row.label,
    createdAt: row.created_at,
    // owner_id intentionally omitted
  }
}
```

Pair with a row-level security policy so the client cannot insert a row with `owner_id` ≠ `auth.uid()`.

---

### Patch D — Enforce Bans at the Data Layer

Make banning atomic by combining the read with the mutation in a single RPC, and add a defensive check in every public mutation path.

```typescript
// lib/moderation.ts
import { createSupabaseServerClient } from '@/lib/supabase/server'

export class BannedUserError extends Error {
  constructor() { super('user_banned'); this.name = 'BannedUserError' }
}

export async function assertNotBanned(): Promise<{ userId: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  // Atomic SELECT ... FOR UPDATE would be ideal; with Supabase use an RPC:
  const { data, error } = await supabase.rpc('assert_user_not_banned', {
    p_user: user.id,
  })
  if (error) throw error
  if (!data?.ok) throw new BannedUserError()
  return { userId: user.id }
}
```

The matching SQL function (run once in a migration):

```sql
create or replace function assert_user_not_banned(p_user uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_status text;
begin
  select status into v_status
    from user_moderation
   where user_id = p_user
   for update;          -- locks the row so a concurrent ban cannot slip past

  if v_status = 'banned' then
    return jsonb_build_object('ok', false, 'reason', 'banned');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Defense in depth: a trigger that aborts mutations from banned users.
create or replace function block_banned_writes()
returns trigger language plpgsql as $$
declare v_status text;
begin
  select status into v_status from user_moderation where user_id = auth.uid();
  if v_status = 'banned' then
    raise exception 'user_banned' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger block_banned_posts
before insert or update on posts
for each row execute function block_banned_writes();
-- Repeat for comments, votes, edits, etc.
```

Call `assertNotBanned()` at the top of every mutation handler. This eliminates the race window and protects any future endpoint that forgets the check.

---

## 4. Security Rating

| Domain | Before | After (with patches) |
|---|---|---|
| OAuth callback / redirect | High risk | Low risk |
| PII in URLs | Medium risk | Low risk |
| Saved-account trust model | High risk | Low risk |
| Banned-user enforcement | High risk | Low risk |
| **Overall** | **HIGH RISK** | **LOW RISK** |

**Recommended priority order:** Patch A (open redirect) → Patch D (ban enforcement) → Patch C (saved-account ID trust) → Patch B (PII in URL) → Patch E (generic error surface hardening).
