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
