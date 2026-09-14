import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Category, PostVibe } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase()
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function compactNumber(num: number): string {
  if (num < 1000) return num.toString()
  if (num < 1000000) return `${(num / 1000).toFixed(1).replace(/\.0$/, "")}k`
  return `${(num / 1000000).toFixed(1).replace(/\.0$/, "")}M`
}

const MAX_HASHTAGS = 5
const MAX_TAG_LENGTH = 30
// Lowercase alpha-numeric, Hindi / Indic unicode scripts (Devanagari, Telugu, Tamil, Bengali, Kannada, Malayalam, Gujarati, Gurmukhi, Odia), underscore.
const TAG_RE = /^[a-z0-9_\u0900-\u097F\u0C00-\u0C7F\u0B80-\u0BFF\u0980-\u09FF\u0C80-\u0CFF\u0D00-\u0D7F\u0A80-\u0AFF\u0A00-\u0A7F\u0B00-\u0B7F]+$/

// Emoji and pictographic symbols regex
export const EMOJI_REGEX = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]/u

/**
 * Checks if a string contains any emojis or pictographic symbols.
 */
export function containsEmoji(str: string): boolean {
  return EMOJI_REGEX.test(str)
}

// Keys of the hashtag validation strings (must exist in lib/strings.ts).
export type HashtagErrorKey =
  | "validation.hashtagsTooMany"
  | "validation.hashtagTooLong"
  | "validation.hashtagInvalid"
  | "validation.hashtagNoEmoji"

// Parse a raw hashtag input ("#academic, hostel #Fees" -> ["academic","hostel","fees"]).
// Returns an error key (via `strings`) when invalid, or null when valid.
export function parseHashtags(
  raw: string,
): { tags: string[]; error: HashtagErrorKey | null } {
  if (!raw.trim()) return { tags: [], error: null }
  const tags: string[] = []
  for (const chunk of raw.split(/[\s,]+/)) {
    const tag = chunk.replace(/^#+/, "").trim().toLowerCase()
    if (!tag) continue
    if (tags.includes(tag)) continue
    if (tags.length >= MAX_HASHTAGS) return { tags, error: "validation.hashtagsTooMany" }
    if (tag.length > MAX_TAG_LENGTH) return { tags, error: "validation.hashtagTooLong" }
    if (containsEmoji(tag)) return { tags, error: "validation.hashtagNoEmoji" }
    if (!TAG_RE.test(tag)) return { tags, error: "validation.hashtagInvalid" }
    tags.push(tag)
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

/**
 * Detects whether a post is a Campus Grievance / Whistleblower Issue,
 * a Campus Life & Fun post (fests, parties, hostel banter), or
 * a Study Hub & Academic post (notes, PYQs, exam cheat sheets, placement tips).
 */
export function getPostVibe(post: {
  text?: string | null
  category?: string | null
  hashtags?: string[] | null
  isAnonymous?: boolean | null
  isResolved?: boolean | null
}): PostVibe {
  const tags = (post.hashtags || []).map((t) => t.toLowerCase())
  const joinedTags = tags.join(" ")

  // 1. Campus Life & Fun keywords
  if (
    /(fest|fests|party|parties|celebrat|freshers|farewell|hostellife|hosteldiar|canteen|foodie|crush|hangout|hangouts|meme|memes|cultural|sports|trip|vibe|vibes|collegeevent|music|dance|fun|reels|nightout|djnight)/i.test(
      joinedTags,
    )
  ) {
    return "life"
  }

  // 2. Study Hub & Academics keywords
  if (
    /(notes|pyq|pyqs|studytip|studytips|studying|examhack|examhacks|syllabus|cheatsheet|material|materials|lecture|gate|cat|jee|placement|placements|intern|internship|resume|interview|coding|hackathon|project|resources|assignments|solutions)/i.test(
      joinedTags,
    )
  ) {
    return "study"
  }

  // 3. Other / General discussions & questions
  if (
    /(other|general|campusgeneral|discussion|discuss|askcampus|question|query|advice|thoughts|opinion|random|connect|batch)/i.test(
      joinedTags,
    )
  ) {
    return "other"
  }

  // 4. Grievances / Whistleblower / Issues:
  // If anonymous, resolved, or tagged with issues/complaints/ragging/fees/mess/admin
  if (
    post.isAnonymous ||
    post.isResolved ||
    post.category === "Harassment" ||
    post.category === "Mental Health" ||
    post.category === "Financial" ||
    /(issue|complaint|grievance|problem|mess|food|hostel|water|wifi|admin|fee|fees|fine|fines|ragging|bully|harass|corrupt|hygiene|sanitation|electricity|protest|justice|scam|retaliation|threat|action)/i.test(
      joinedTags,
    )
  ) {
    return "issue"
  }

  // Check text content if tags are sparse or empty
  if (post.text) {
    const text = post.text.toLowerCase()
    if (
      /(fest|annual fest|freshers party|farewell party|dj night|cultural night|hostel fun|canteen food|sports day|college trip|college vibe)/i.test(
        text,
      )
    ) {
      return "life"
    }
    if (
      /(handwritten notes|pyq|previous year question|study material|lecture notes|exam tips|cheatsheet|placement drive|interview prep|resume review|coding challenge)/i.test(
        text,
      )
    ) {
      return "study"
    }
    if (/(general question|anyone know|quick question|thoughts on|opinions on)/i.test(text)) {
      return "other"
    }
  }

  // Fallbacks based on category column
  if (post.category === "Placements" || post.category === "Exams") {
    return "study"
  }

  // Krantind's foundational mission: Campus Voice & Issues
  return "issue"
}

/**
 * Strict open-redirect guard. Ensures redirect URLs are strictly internal relative paths.
 * Blocks protocol-relative (//evil.com), backslash tricks (/\\evil.com), control characters,
 * and dangerous protocols (javascript:, data:, vbscript:).
 */
export function getSafeRedirect(next: string | null | undefined, fallback = "/feed"): string {
  if (!next || typeof next !== "string") return fallback
  const trimmed = next.trim()
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    trimmed.toLowerCase().startsWith("/javascript:") ||
    trimmed.toLowerCase().startsWith("/data:") ||
    trimmed.toLowerCase().startsWith("/vbscript:") ||
    /[\x00-\x1F\x7F]/.test(trimmed)
  ) {
    return fallback
  }
  return trimmed
}

/**
 * Validates media URLs to block malicious schemes (javascript:, vbscript:, data:text/html, etc.).
 */
export function isSafeMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false
  const trimmed = url.trim().toLowerCase()
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("data:text/html") ||
    trimmed.startsWith("data:application/")
  ) {
    return false
  }
  return (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("data:video/") ||
    (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.includes("\\"))
  )
}