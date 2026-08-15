// General-purpose helper functions shared across the app.

import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category } from "@/lib/types"

// Merge conditional Tailwind classes safely.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate the first two initials from a person's name (for Avatar fallback).
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase()
}

// Clamp a value between min and max.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Relative time labels like "5m ago", "3h ago", "2d ago".
export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" })
}

// Short numeric formatting: 1200 -> "1.2k".
export function compactNumber(n: number): string {
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
}

const TAG_RE = /^[a-zA-Z0-9_]+$/
const MAX_HASHTAGS = 5
const MAX_TAG_LENGTH = 30

// Keys of the hashtag validation strings (must exist in lib/strings.ts).
export type HashtagErrorKey =
  | "validation.hashtagsTooMany"
  | "validation.hashtagTooLong"
  | "validation.hashtagInvalid"

// Parse a raw hashtag input ("#academic, hostel #Fees" -> ["academic","hostel","fees"]).
// Returns an error key (via `strings`) when invalid, or null when valid.
export function parseHashtags(
  raw: string,
): { tags: string[]; error: HashtagErrorKey | null } {
  const tags: string[] = []
  for (const chunk of raw.split(/[\s,]+/)) {
    const tag = chunk.replace(/^#+/, "").trim().toLowerCase()
    if (!tag) continue
    if (tags.length >= MAX_HASHTAGS) return { tags, error: "validation.hashtagsTooMany" }
    if (tag.length > MAX_TAG_LENGTH) return { tags, error: "validation.hashtagTooLong" }
    if (!TAG_RE.test(tag)) return { tags, error: "validation.hashtagInvalid" }
    if (!tags.includes(tag)) tags.push(tag)
  }
  return { tags, error: null }
}

// Map hashtags back to the (legacy) DB category so the NOT NULL category
// column keeps working. Defaults to "Academic" when nothing matches.
export function categoryFromHashtags(tags: string[]): Category {
  const joined = tags.join(" ")
  if (/(harass|bully|ragging|abuse)/.test(joined)) return "Harassment"
  if (/(mental|stress|depress|anxi|suicide)/.test(joined)) return "Mental Health"
  if (/(financ|fee|loan|money|scholarship)/.test(joined)) return "Financial"
  if (/(placement|job|intern|career|campus drive)/.test(joined)) return "Placements"
  if (/(exam|stud|academic|study|class|syllabus|marks)/.test(joined)) return "Exams"
  return "Academic"
}