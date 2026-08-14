// Unit tests for pure helpers in lib/utils.ts, run with the built-in Node test
// runner (zero dependencies): `npm test` -> `node --test "tests/*.test.ts"`
// Node >= 22.6 can execute TypeScript directly (type stripping).
import { test } from "node:test"
import assert from "node:assert/strict"

import {
  cn,
  initialsOf,
  clamp,
  timeAgo,
  compactNumber,
} from "../lib/utils.ts"

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

function lastLocaleDate(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

test("compactNumber", () => {
  assert.equal(compactNumber(0), "0")
  assert.equal(compactNumber(999), "999")
  assert.equal(compactNumber(1000), "1k")
  assert.equal(compactNumber(1200), "1.2k")
  assert.equal(compactNumber(10_500), "10.5k")
})