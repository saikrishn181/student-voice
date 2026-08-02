// Shared types for StudentVoice. Reused by every phase.
// Types ending in a `TODO` marker correspond to fields that will be backed by
// Supabase records in a later phase.

export type AccountType = "student" | "organization"

export type OrganizationType =
  | "student_union"
  | "ngo"
  | "coaching_institute"
  | "campus_club"
  | "other"

// TODO: replace with Supabase Auth user row
export interface User {
  id: string
  name: string
  email: string
  accountType: AccountType
  // Only meaningful when accountType === "organization"
  organizationType?: OrganizationType
  // Only set for organizations; affects Phase 3 verification flow.
  verificationStatus?: "pending" | "verified" | "rejected"
  avatarUrl?: string
  state?: string
  district?: string
  createdAt: string // ISO
}

// Region types (state -> district), used on the onboarding/region page.
export interface Region {
  state: string
  districts: string[]
}

// Units after which tabular data in later phases will render. Defined now for
// the design system; not yet used by pages.
export type CategoryId = string

export type ToastTone = "success" | "error" | "info"
export type ToastKind = "success" | "error" | "info"