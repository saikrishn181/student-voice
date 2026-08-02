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
  bio?: string
  followerCount: number
  followingCount: number
  createdAt: string // ISO
}

// Post categories (Phase 2).
export type Category =
  | "Academic"
  | "Harassment"
  | "Mental Health"
  | "Financial"
  | "Exams"
  | "Placements"

export type MediaType = "photo" | "video" | null

// TODO: replace with Supabase posts table row
export interface Post {
  id: string
  authorId: string
  text: string
  mediaUrl: string | null
  mediaType: MediaType
  // Width/height ratio (e.g. 1.5). null until MediaDisplay measures it at runtime.
  mediaAspectRatio: number | null
  state: string
  district: string
  category: Category
  supportCount: number
  commentCount: number
  createdAt: string // ISO
  supportedByCurrentUser: boolean
}

// TODO: replace with Supabase comments table row
export interface Comment {
  id: string
  postId: string
  authorId: string
  text: string
  // True when an organization is offering help (not just a student reply).
  isOrgHelp: boolean
  createdAt: string // ISO
}

// Follow relationships (follower is following the target user).
export interface Follow {
  followerId: string
  followingId: string
}

// Region types (state -> district), used on the onboarding/region page.
export interface Region {
  state: string
  districts: string[]
}

export type ToastTone = "success" | "error" | "info"
export type ToastKind = "success" | "error" | "info"