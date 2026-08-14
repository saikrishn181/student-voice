// Fixed application values (states, categories, organization types).
// FIXED constant set reused by auth/onboarding and future feed phases.

import type { Category, OrganizationType } from "@/lib/types"

// All Indian states & union territories.
export { STATES } from "./india-regions"

// Account types offered at signup.
export const ACCOUNT_TYPES = ["student", "organization"] as const

// Organization type options with human labels + icons (lucide) later phases.
export const ORGANIZATION_TYPES: {
  value: OrganizationType
  label: string
}[] = [
  { value: "student_union", label: "Student Union" },
  { value: "ngo", label: "NGO" },
  { value: "coaching_institute", label: "Coaching Institute" },
  { value: "campus_club", label: "Campus Club" },
  { value: "other", label: "Other" },
]

// List of post categories (feed filter in Phase 2+).
export const CATEGORIES: {
  value: Category
  label: string
  emoji: string
}[] = [
  { value: "Academic", label: "Academic", emoji: "📚" },
  { value: "Harassment", label: "Harassment", emoji: "⚠️" },
  { value: "Mental Health", label: "Mental Health", emoji: "🧠" },
  { value: "Financial", label: "Financial", emoji: "💰" },
  { value: "Exams", label: "Exams", emoji: "📝" },
  { value: "Placements", label: "Placements", emoji: "💼" },
]

// Options shape for the Select component (create-post page, filters).
export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({
  value: c.value,
  label: `${c.emoji} ${c.label}`,
}))

export function labelForCategory(category: Category): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}

// How many posts to load per batch in the infinite-scroll feed.
export const FEED_PAGE_SIZE = 10

// Cap post / comment lengths (enforced client-side here, mirroring the DB
// check constraints in supabase/schema.sql).
export const MAX_POST_CHARS = 2000
export const MAX_COMMENT_CHARS = 500

// The default Redirect target after a successful login (user already has a region).
export const LOGGED_IN_HOME = "/feed"

// Redirect target right after a fresh signup (region not set yet).
export const POST_SIGNUP_ROUTE = "/onboarding/region"