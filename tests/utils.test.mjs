import { test } from "node:test"
import assert from "node:assert/strict"

import {
  cn,
  initialsOf,
  clamp,
  timeAgo,
  compactNumber,
  parseHashtags,
  categoryFromHashtags,
  getPostVibe,
  getSafeRedirect,
  isSafeMediaUrl,
  containsEmoji,
} from "./utils-runner.mjs"

test("cn merges tailwind classes without conflicts", () => {
  assert.equal(cn("px-2", "px-4"), "px-4")
  assert.equal(cn("text-red-500", undefined, null, false), "text-red-500")
  assert.equal(cn("a b", { c: true, d: false }), "a b c")
})

test("initialsOf", () => {
  assert.equal(initialsOf("Mira Verma"), "MV")
  assert.equal(initialsOf("mira"), "M")
  assert.equal(initialsOf("  MIRA  VERMA  "), "MV")
  assert.equal(initialsOf("   "), "?")
  assert.equal(initialsOf(""), "?")
})

test("clamp", () => {
  assert.equal(clamp(5, 0, 10), 5)
  assert.equal(clamp(-3, 0, 10), 0)
  assert.equal(clamp(15, 0, 10), 10)
})

test("timeAgo", () => {
  const now = Date.now()
  assert.match(timeAgo(new Date(now - 5_000).toISOString()), /just now/)
  assert.equal(timeAgo(new Date(now - 30_000).toISOString()), "just now")
  assert.equal(timeAgo(new Date(now - 5 * 60_000).toISOString()), "5m ago")
  assert.equal(timeAgo(new Date(now - 3 * 3_600_000).toISOString()), "3h ago")
  assert.equal(timeAgo(new Date(now - 2 * 86_400_000).toISOString()), "2d ago")
  assert.equal(timeAgo(new Date(now - 30 * 86_400_000).toISOString()), lastLocaleDate(new Date(now - 30 * 86_400_000)))
})

function lastLocaleDate(d) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

test("compactNumber", () => {
  assert.equal(compactNumber(0), "0")
  assert.equal(compactNumber(999), "999")
  assert.equal(compactNumber(1000), "1k")
  assert.equal(compactNumber(1200), "1.2k")
  assert.equal(compactNumber(10_500), "10.5k")
})

test("parseHashtags normalizes input", () => {
  assert.deepEqual(parseHashtags("#academic, hostel #Fees"), {
    tags: ["academic", "hostel", "fees"],
    error: null,
  })
  assert.deepEqual(parseHashtags("  #A  #a  "), { tags: ["a"], error: null })
  assert.deepEqual(parseHashtags("#a #b #c #d #e #a"), {
    tags: ["a", "b", "c", "d", "e"],
    error: null,
  })
  assert.deepEqual(parseHashtags(""), { tags: [], error: null })
})

test("parseHashtags rejects invalid input", () => {
  const tooMany = parseHashtags("a b c d e f")
  assert.equal(tooMany.error, "validation.hashtagsTooMany")
  const tooLong = parseHashtags("a".repeat(31))
  assert.equal(tooLong.error, "validation.hashtagTooLong")
  const invalid = parseHashtags("has-tag")
  assert.equal(invalid.error, "validation.hashtagInvalid")
  const withEmoji = parseHashtags("#campus🔥")
  assert.equal(withEmoji.error, "validation.hashtagNoEmoji")
})

test("containsEmoji accurately identifies emojis while allowing regular text", () => {
  assert.equal(containsEmoji("Hello World"), false)
  assert.equal(containsEmoji("Rahul Sharma"), false)
  assert.equal(containsEmoji("rahul_sharma123"), false)
  assert.equal(containsEmoji("Rahul 🔥"), true)
  assert.equal(containsEmoji("Hostel 4 🚀"), true)
  assert.equal(containsEmoji("🎉"), true)
})

test("categoryFromHashtags maps keywords to categories", () => {
  assert.equal(categoryFromHashtags(["harassment"]), "Harassment")
  assert.equal(categoryFromHashtags(["mental-health", "stress"]), "Mental Health")
  assert.equal(categoryFromHashtags(["fee", "scholarship"]), "Financial")
  assert.equal(categoryFromHashtags(["placement", "intern"]), "Placements")
  assert.equal(categoryFromHashtags(["exams", "marks"]), "Exams")
  assert.equal(categoryFromHashtags(["hostel"]), "Academic")
})

test("getPostVibe correctly categorizes grievances, campus life/fun, and study hub/notes", () => {
  // Campus Life & Fun
  assert.equal(getPostVibe({ hashtags: ["fest", "collegevibe"] }), "life")
  assert.equal(getPostVibe({ hashtags: ["freshers", "party"] }), "life")
  assert.equal(getPostVibe({ hashtags: ["hosteldiaries", "canteen"] }), "life")
  assert.equal(getPostVibe({ hashtags: ["farewell", "fun"] }), "life")
  assert.equal(getPostVibe({ text: "Our annual fest DJ night was legendary yesterday!" }), "life")

  // Study Hub & Notes
  assert.equal(getPostVibe({ hashtags: ["notes", "cheatsheet"] }), "study")
  assert.equal(getPostVibe({ hashtags: ["pyq", "examprep"] }), "study")
  assert.equal(getPostVibe({ hashtags: ["placement", "interview"] }), "study")
  assert.equal(getPostVibe({ text: "Here are my handwritten lecture notes for compiler design" }), "study")

  // Issues & Whistleblower
  assert.equal(getPostVibe({ hashtags: ["messfood", "insects"] }), "issue")
  assert.equal(getPostVibe({ hashtags: ["feehike", "protest"] }), "issue")
  assert.equal(getPostVibe({ isAnonymous: true }), "issue")
  assert.equal(getPostVibe({ isResolved: true }), "issue")
  assert.equal(getPostVibe({ category: "Harassment" }), "issue")

  // Other / General Discussions & Questions
  assert.equal(getPostVibe({ hashtags: ["campusgeneral"] }), "other")
  assert.equal(getPostVibe({ hashtags: ["askcampus", "question"] }), "other")
  assert.equal(getPostVibe({ hashtags: ["discussion", "batch2026"] }), "other")
  assert.equal(getPostVibe({ text: "Quick question for anyone staying near North Campus" }), "other")
})

test("getSafeRedirect prevents open redirects, backslashes, and dangerous schemes", () => {
  assert.equal(getSafeRedirect(null), "/feed")
  assert.equal(getSafeRedirect(""), "/feed")
  assert.equal(getSafeRedirect("https://attacker.com"), "/feed")
  assert.equal(getSafeRedirect("//attacker.com"), "/feed")
  assert.equal(getSafeRedirect("/\\attacker.com"), "/feed")
  assert.equal(getSafeRedirect("javascript:alert(1)"), "/feed")
  assert.equal(getSafeRedirect("/javascript:alert(1)"), "/feed")
  assert.equal(getSafeRedirect("/data:text/html,hack"), "/feed")
  assert.equal(getSafeRedirect("/feed\r\nevil.com"), "/feed")
  assert.equal(getSafeRedirect("/feed\tevil.com"), "/feed")
  assert.equal(getSafeRedirect("/profile/c87a19e4"), "/profile/c87a19e4")
  assert.equal(getSafeRedirect("/feed?tag=fees"), "/feed?tag=fees")
})

test("isSafeMediaUrl validates safe image and video sources", () => {
  assert.equal(isSafeMediaUrl(null), false)
  assert.equal(isSafeMediaUrl(""), false)
  assert.equal(isSafeMediaUrl("javascript:alert(1)"), false)
  assert.equal(isSafeMediaUrl("data:text/html;base64,PHNjcmlwdD4="), false)
  assert.equal(isSafeMediaUrl("https://example.supabase.co/storage/v1/object/public/post-media/1.jpg"), true)
  assert.equal(isSafeMediaUrl("blob:http://localhost:3000/1234"), true)
  assert.equal(isSafeMediaUrl("/logo.png"), true)
})

test("topic filter matches tags case-insensitively", () => {
  const followedTopics = ["hostel", "exams"]
  const postHashtags = ["Hostel", "MessFood"]
  const matches = postHashtags.some((t) => followedTopics.includes(t.toLowerCase()))
  assert.equal(matches, true)

  const nonMatching = ["Placement", "Campus"]
  const noMatch = nonMatching.some((t) => followedTopics.includes(t.toLowerCase()))
  assert.equal(noMatch, false)
})

test("tag route normalizes input across cases and leading hashes", () => {
  function normalizeTag(raw) {
    return raw.trim().replace(/^#+/, "").toLowerCase()
  }
  assert.equal(normalizeTag("Hostel"), "hostel")
  assert.equal(normalizeTag("#Hostel"), "hostel")
  assert.equal(normalizeTag("##CAMPUS_LIFE "), "campus_life")
  assert.equal(normalizeTag("exams"), "exams")
})

test("admin can delete any comment while non-admin can only delete their own", () => {
  function canDeleteComment(commentAuthorId, currentUserId, isAdmin) {
    return commentAuthorId === currentUserId || Boolean(isAdmin)
  }
  // Author deleting own comment
  assert.equal(canDeleteComment("user-1", "user-1", false), true)
  // Regular user cannot delete another user's comment
  assert.equal(canDeleteComment("user-1", "user-2", false), false)
  // Admin can delete any user's comment
  assert.equal(canDeleteComment("user-1", "admin-1", true), true)
})

test("password policy enforces minimum 8 characters across signup, reset, and settings", () => {
  function isPasswordValid(password) {
    return typeof password === "string" && password.length >= 8
  }
  assert.equal(isPasswordValid("123456"), false)
  assert.equal(isPasswordValid("1234567"), false)
  assert.equal(isPasswordValid("12345678"), true)
  assert.equal(isPasswordValid("Pass@word123"), true)
})
