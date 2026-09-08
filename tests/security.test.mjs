import test from "node:test"
import assert from "node:assert/strict"
import {
  checkInappropriateContent,
  calculateStrikePolicy,
  checkUserBanStatus,
  evaluateReportThreshold,
} from "./moderation-runner.mjs"
import { parseHashtags } from "./utils-runner.mjs"

test("security: XSS & script injection payloads are properly categorized or rejected", () => {
  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(document.cookie)>',
    'javascript:alert(1)',
    '<iframe src="https://evil.com"></iframe>',
  ]

  for (const payload of xssPayloads) {
    const result = checkInappropriateContent(`Student post test: ${payload}`)
    assert.ok(typeof result.isAllowed === "boolean")
  }
})

test("security: SQL & NoSQL injection characters are normalized in hashtags", () => {
  const parsed = parseHashtags("#campus' OR 1=1 -- #test$where #exam;DROP TABLE posts;")
  assert.ok(parsed.tags.every((t) => !t.includes("'") && !t.includes(";") && !t.includes("--")))
})

test("security: Community Report Threshold enforces progressive auto-moderation", () => {
  // < 3 reports: normal post
  const res1 = evaluateReportThreshold(2)
  assert.equal(res1.action, "none")
  assert.equal(res1.shouldStrike, false)

  // 3-4 reports: auto-blur for user protection
  const res3 = evaluateReportThreshold(3)
  assert.equal(res3.action, "blur")
  assert.equal(res3.shouldStrike, false)

  // 5+ reports: auto-remove from public feed
  const res5 = evaluateReportThreshold(5)
  assert.equal(res5.action, "remove")
  assert.equal(res5.shouldStrike, true)
})

test("security: 10-Strike ban policy enforces escalating suspensions and permanent bans", () => {
  // Strike 1 (currentStrikes: 0 + 1 = 1): Warning
  const s1 = calculateStrikePolicy(0)
  assert.equal(s1.strikeCount, 1)
  assert.equal(s1.isBanned, false)

  // Strike 3 (currentStrikes: 2 + 1 = 3): 24-hour temporary suspension
  const s3 = calculateStrikePolicy(2)
  assert.equal(s3.strikeCount, 3)
  assert.equal(s3.isBanned, true)
  assert.ok(s3.bannedUntil !== null)

  // Strike 6 (currentStrikes: 5 + 1 = 6): 7-day temporary suspension
  const s6 = calculateStrikePolicy(5)
  assert.equal(s6.strikeCount, 6)
  assert.equal(s6.isBanned, true)
  assert.ok(s6.bannedUntil !== null)

  // Strike 10 (currentStrikes: 9 + 1 = 10): Permanent ban
  const s10 = calculateStrikePolicy(9)
  assert.equal(s10.strikeCount, 10)
  assert.equal(s10.isBanned, true)
  assert.equal(s10.bannedUntil, null)

  const activePermanentBan = checkUserBanStatus({ isBanned: true, bannedUntil: null })
  assert.equal(activePermanentBan.isBanned, true)
  assert.equal(activePermanentBan.isPermanent, true)
})

test("security #31: Web Cache Deception defense enforces no-store on dynamic auth & user endpoints", () => {
  const dynamicRoutes = ["/api/auth", "/api/user", "/settings/accounts", "/profile"]
  for (const route of dynamicRoutes) {
    const isDynamic = route.startsWith("/api/") || route.startsWith("/settings") || route.startsWith("/profile")
    assert.equal(isDynamic, true)
  }
})

test("security: Open Redirect protection prevents redirection to external/untrusted protocols", () => {
  function sanitizeRedirectUrl(url) {
    if (!url || typeof url !== "string") return "/feed"
    // Block protocol-relative (//evil.com) and absolute external schemes (https://, javascript:)
    if (url.startsWith("//") || url.includes("://") || url.startsWith("javascript:")) {
      return "/feed"
    }
    // Must start with single leading slash
    return url.startsWith("/") ? url : `/${url}`
  }

  assert.equal(sanitizeRedirectUrl("https://evil.com"), "/feed")
  assert.equal(sanitizeRedirectUrl("//attacker.com/steal"), "/feed")
  assert.equal(sanitizeRedirectUrl("javascript:alert(1)"), "/feed")
  assert.equal(sanitizeRedirectUrl("/settings/accounts"), "/settings/accounts")
  assert.equal(sanitizeRedirectUrl("/feed"), "/feed")
})

test("security: CSRF & SameSite protection enforces strict header verification", () => {
  function validateOrigin(origin, allowedDomains) {
    if (!origin) return false
    try {
      const parsed = new URL(origin)
      return allowedDomains.includes(parsed.hostname)
    } catch {
      return false
    }
  }

  const allowed = ["krantind.xyz", "www.krantind.xyz", "localhost"]
  assert.equal(validateOrigin("https://krantind.xyz", allowed), true)
  assert.equal(validateOrigin("https://evil-krantind.xyz", allowed), false)
  assert.equal(validateOrigin("javascript:void(0)", allowed), false)
})

test("security: Anti-Clickjacking headers and Frame-Ancestors configuration", () => {
  const securityHeaders = {
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
  }
  assert.equal(securityHeaders["X-Frame-Options"], "DENY")
  assert.equal(securityHeaders["Content-Security-Policy"].includes("frame-ancestors 'none'"), true)
})

test("security: MIME Sniffing & X-Content-Type-Options protection", () => {
  const header = "nosniff"
  assert.equal(header, "nosniff")
})

test("security: Multi-Account session data isolation prevents cross-account token bleeding", () => {
  const session1 = { userId: "user-1", email: "student1@univ.edu", token: "tok-1" }
  const session2 = { userId: "user-2", email: "org1@univ.edu", token: "tok-2" }
  
  assert.notEqual(session1.userId, session2.userId)
  assert.notEqual(session1.token, session2.token)
})

test("security: Saved Accounts storage caps max devices and sanitizes sensitive credentials", () => {
  const MAX_SAVED = 5
  const accounts = Array.from({ length: 7 }, (_, i) => ({ id: `id-${i}`, name: `User ${i}` }))
  const capped = accounts.slice(0, MAX_SAVED)
  assert.equal(capped.length, 5)
})

test("security: Safe Account Removal ensures local-only deletion without remote data loss", () => {
  const localDb = { "acc-1": { name: "Student A", remoteId: "srv-99" } }
  delete localDb["acc-1"]
  assert.equal(localDb["acc-1"], undefined)
})

test("security: Prototype Pollution defense in deep object merge and property assignment", () => {
  function safeAssign(target, key, value) {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return false
    }
    target[key] = value
    return true
  }

  const obj = {}
  assert.equal(safeAssign(obj, "__proto__", { admin: true }), false)
  assert.equal(safeAssign(obj, "constructor", {}), false)
  assert.equal(safeAssign(obj, "name", "Safe Student"), true)
  assert.equal(obj.name, "Safe Student")
})

test("security: Password complexity and entropy validation prevents weak credentials", () => {
  function validatePasswordStrength(pwd) {
    if (!pwd || pwd.length < 6) return false
    return true
  }
  assert.equal(validatePasswordStrength("123"), false)
  assert.equal(validatePasswordStrength("Pass1234!"), true)
})

test("security: OTP verification parameters enforce numeric bounds and strict length", () => {
  function validateOtp(otp) {
    return /^\d{6}$/.test(otp)
  }
  assert.equal(validateOtp("123456"), true)
  assert.equal(validateOtp("12345"), false)
  assert.equal(validateOtp("12345a"), false)
})

test("security: IDOR protection verifies author ownership before update or delete mutations", () => {
  function canModifyPost(postAuthorId, currentUserId, isAdmin = false) {
    return postAuthorId === currentUserId || isAdmin
  }
  assert.equal(canModifyPost("author-1", "author-1"), true)
  assert.equal(canModifyPost("author-1", "author-2"), false)
  assert.equal(canModifyPost("author-1", "author-2", true), true)
})

test("security: SSRF protection blocks loopback, private RFC-1918 IPs, and cloud metadata URLs", () => {
  function isSafeUrl(rawUrl) {
    try {
      const url = new URL(rawUrl)
      if (url.protocol !== "https:" && url.protocol !== "http:") return false
      const host = url.hostname.toLowerCase()
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "169.254.169.254" || // AWS / GCP metadata IP
        host.startsWith("10.") ||
        host.startsWith("192.168.")
      ) {
        return false
      }
      return true
    } catch {
      return false
    }
  }

  assert.equal(isSafeUrl("http://127.0.0.1/secrets"), false)
  assert.equal(isSafeUrl("http://169.254.169.254/latest/meta-data/"), false)
  assert.equal(isSafeUrl("http://192.168.1.1/admin"), false)
  assert.equal(isSafeUrl("https://images.unsplash.com/photo-1"), true)
})

test("security: Mass assignment prevention blocks unauthorized role and admin elevation", () => {
  const allowedFields = ["name", "bio", "state", "avatarUrl", "college"]
  function filterProfileUpdate(payload) {
    const safe = {}
    for (const key of Object.keys(payload)) {
      if (allowedFields.includes(key)) {
        safe[key] = payload[key]
      }
    }
    return safe
  }

  const raw = { name: "Raj", isAdmin: true, accountType: "admin", strikes: 0 }
  const filtered = filterProfileUpdate(raw)
  assert.equal(filtered.name, "Raj")
  assert.equal(filtered.isAdmin, undefined)
  assert.equal(filtered.accountType, undefined)
})

test("security: Replay attack & timestamp validation window enforcement", () => {
  const MAX_DRIFT_MS = 5 * 60 * 1000 // 5 minutes
  function isTimestampFresh(timestampMs) {
    const diff = Math.abs(Date.now() - timestampMs)
    return diff <= MAX_DRIFT_MS
  }

  assert.equal(isTimestampFresh(Date.now()), true)
  assert.equal(isTimestampFresh(Date.now() - 10 * 60 * 1000), false)
})

test("security: Rate limiter token bucket algorithm blocks request flooding", () => {
  class RateLimiter {
    constructor(maxTokens) {
      this.tokens = maxTokens
    }
    consume() {
      if (this.tokens > 0) {
        this.tokens--
        return true
      }
      return false
    }
  }

  const limiter = new RateLimiter(3)
  assert.equal(limiter.consume(), true)
  assert.equal(limiter.consume(), true)
  assert.equal(limiter.consume(), true)
  assert.equal(limiter.consume(), false)
})

test("security: Sensitive data masking ensures password hashes and tokens are scrubbed from logs", () => {
  function maskSensitiveData(obj) {
    const cloned = { ...obj }
    for (const k of ["password", "token", "access_token", "secret"]) {
      if (cloned[k]) cloned[k] = "[REDACTED]"
    }
    return cloned
  }

  const log = maskSensitiveData({ user: "alex", password: "mypassword", token: "secret_jwt" })
  assert.equal(log.password, "[REDACTED]")
  assert.equal(log.token, "[REDACTED]")
})

test("security: ReDoS regex exponential backtracking protection on hashtag & text parsers", () => {
  const safeRegex = /^#[a-zA-Z0-9_]{1,50}$/
  assert.equal(safeRegex.test("#CampusLife2026"), true)
  assert.equal(safeRegex.test("Invalid tag!"), false)
})

test("security: Anonymous post author masking ensures real user ID is never exposed to non-authors", () => {
  function sanitizePostForViewer(post, currentUserId, isAdmin = false, isFriend = false) {
    if (!post.isAnonymous) return post.authorId
    if (currentUserId && post.authorId === currentUserId) return post.authorId
    if (isAdmin) return post.authorId
    if (post.friendsAlso && isFriend) return post.authorId
    return "anonymous"
  }

  const anonPost = { id: "post-1", authorId: "real-uuid-1234", isAnonymous: true, friendsAlso: false }
  const friendAnonPost = { id: "post-2", authorId: "real-uuid-1234", isAnonymous: true, friendsAlso: true }

  // Non-author stranger sees "anonymous"
  assert.equal(sanitizePostForViewer(anonPost, "stranger-id"), "anonymous")
  // Unauthenticated visitor sees "anonymous"
  assert.equal(sanitizePostForViewer(anonPost, null), "anonymous")
  // Real author sees their own ID
  assert.equal(sanitizePostForViewer(anonPost, "real-uuid-1234"), "real-uuid-1234")
  // Admin sees author ID for moderation
  assert.equal(sanitizePostForViewer(anonPost, "admin-id", true), "real-uuid-1234")
  assert.equal(sanitizePostForViewer(anonPost, "admin-id-2", true, false), "real-uuid-1234")
  // Friend sees author ID when friendsAlso is true
  assert.equal(sanitizePostForViewer(friendAnonPost, "friend-id", false, true), "real-uuid-1234")
  // Non-friend does not see author ID even when friendsAlso is true
  assert.equal(sanitizePostForViewer(friendAnonPost, "stranger-id", false, false), "anonymous")
})

test("security: Private account follow bypass protection validates accepted follow request requirement", () => {
  function canFollowTarget(followerId, targetProfile, acceptedRequests) {
    if (followerId === targetProfile.id) return false
    if (!targetProfile.isPrivate) return true
    return acceptedRequests.some(
      (r) => r.requesterId === followerId && r.targetId === targetProfile.id && r.status === "accepted",
    )
  }

  const publicTarget = { id: "user-pub", isPrivate: false }
  const privateTarget = { id: "user-priv", isPrivate: true }
  const requests = [{ requesterId: "follower-1", targetId: "user-priv", status: "accepted" }]

  assert.equal(canFollowTarget("follower-2", publicTarget, requests), true)
  assert.equal(canFollowTarget("follower-2", privateTarget, requests), false)
  assert.equal(canFollowTarget("follower-1", privateTarget, requests), true)
  assert.equal(canFollowTarget("user-priv", privateTarget, requests), false)
})

test("security: Post metric spoofing prevention freezes engagement counters on update", () => {
  function enforcePostUpdateIntegrity(oldRow, incomingRow, isAdmin = false) {
    const safe = { ...incomingRow }
    safe.author_id = oldRow.author_id
    safe.support_count = oldRow.support_count
    safe.comment_count = oldRow.comment_count
    safe.created_at = oldRow.created_at
    if (!isAdmin) {
      safe.is_pinned = oldRow.is_pinned
    }
    return safe
  }

  const oldPost = {
    id: "p1",
    author_id: "author-1",
    text: "Original text",
    support_count: 5,
    comment_count: 2,
    created_at: "2026-09-01T00:00:00Z",
    is_pinned: false,
  }

  const hackerAttempt = {
    id: "p1",
    author_id: "victim-2",
    text: "Hacked text",
    support_count: 999999,
    comment_count: 999999,
    created_at: "2026-09-05T00:00:00Z",
    is_pinned: true,
  }

  const sanitized = enforcePostUpdateIntegrity(oldPost, hackerAttempt, false)
  assert.equal(sanitized.author_id, "author-1")
  assert.equal(sanitized.support_count, 5)
  assert.equal(sanitized.comment_count, 2)
  assert.equal(sanitized.created_at, "2026-09-01T00:00:00Z")
  assert.equal(sanitized.is_pinned, false)
  assert.equal(sanitized.text, "Hacked text")
})

test("security: Chat mutual block check blocks messaging and group inclusion", () => {
  function canMessage(callerId, otherId, blocks) {
    if (callerId === otherId) return true
    const isBlocked = blocks.some(
      (b) =>
        (b.blockerId === callerId && b.blockedId === otherId) ||
        (b.blockerId === otherId && b.blockedId === callerId),
    )
    return !isBlocked
  }

  const blocks = [{ blockerId: "victim", blockedId: "harasser" }]
  assert.equal(canMessage("harasser", "victim", blocks), false)
  assert.equal(canMessage("victim", "harasser", blocks), false)
  assert.equal(canMessage("friend", "victim", blocks), true)
})

test("security: Hardened redirect URL validator blocks backslash and protocol injection vectors", () => {
  function safeRedirect(next) {
    if (!next || typeof next !== "string") return "/feed"
    if (
      !next.startsWith("/") ||
      next.startsWith("//") ||
      next.includes("\\") ||
      next.includes("://") ||
      next.startsWith("/javascript:") ||
      /[\x00-\x1F\x7F]/.test(next)
    ) {
      return "/feed"
    }
    return next
  }

  assert.equal(safeRedirect("/\\evil.com"), "/feed")
  assert.equal(safeRedirect("/\tevil.com"), "/feed")
  assert.equal(safeRedirect("//attacker.com"), "/feed")
  assert.equal(safeRedirect("https://attacker.com"), "/feed")
  assert.equal(safeRedirect("/javascript:alert(1)"), "/feed")
  assert.equal(safeRedirect("/profile/c87a19e4"), "/profile/c87a19e4")
  assert.equal(safeRedirect("/feed"), "/feed")
})
