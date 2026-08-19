// Shared types for Krantind. Reused by every phase.
// Types ending in a `TODO` marker correspond to fields that will be backed by
// Supabase records in a later phase.

export type AccountType = "student" | "organization"

export type OrganizationType =
  | "student_union"
  | "ngo"
  | "coaching_institute"
  | "campus_club"
  | "other"

export interface User {
  id: string
  name: string
  email: string
  // Optional public handle (shown as @username on profiles). Set in settings.
  username?: string
  accountType: AccountType
  // Only meaningful when accountType === "organization"
  organizationType?: OrganizationType
  // Only set for organizations; affects Phase 3 verification flow.
  verificationStatus?: "pending" | "verified" | "rejected"
  avatarUrl?: string
  state?: string
  bio?: string
  followerCount: number
  followingCount: number
  createdAt: string // ISO
  // Moderators/admins can review org verification + reports (is_admin column).
  isAdmin: boolean
  // Private accounts (students): posts only visible to followers + self.
  isPrivate?: boolean
}

// Profile row shape from the `public.profiles` Supabase table (snake_case).
export interface Profile {
  id: string
  name: string
  email: string
  username: string | null
  account_type: AccountType
  organization_type: OrganizationType | null
  verification_status: "pending" | "verified" | "rejected" | null
  avatar_url: string | null
  state: string | null
  bio: string | null
  follower_count: number
  following_count: number
  created_at: string
  is_admin: boolean
  is_private: boolean
}

// Post categories (Phase 2).
export type Category =
  | "Academic"
  | "Harassment"
  | "Mental Health"
  | "Financial"
  | "Exams"
  | "Placements"

export type NotificationType =
  | "support"
  | "comment"
  | "follow"
  | "offer_help"
  | "verification_approved"
  | "follow_request"

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  actorId: string
  postId?: string
  read: boolean
  createdAt: string // ISO
}

export type MediaType = "photo" | "video" | null

// Embedded poll on a post (defined in posts.poll_json).
export interface Poll {
  question: string
  options: string[]
  endsAt?: string // ISO
}

export interface Post {
  id: string
  authorId: string
  text: string
  mediaUrl: string | null
  mediaType: MediaType
  // Width/height ratio (e.g. 1.5). null until MediaDisplay measures it at runtime.
  mediaAspectRatio: number | null
  state: string
  category: Category
  // User-added hashtags (e.g. ["academic", "hostel"]), shown as chips.
  hashtags: string[]
  supportCount: number
  commentCount: number
  createdAt: string // ISO
  supportedByCurrentUser: boolean
  // Organizations pin their own posts; shows a badge.
  isPinned: boolean
  // Set when the post was edited (posts.updated_at).
  editedAt?: string
  // Total views; incremented once per post detail visit.
  viewCount: number
  // Future publish time for scheduled posts (orgs).
  scheduledFor?: string
  // Event posts: start time + location (orgs).
  eventAt?: string
  eventLocation?: string
  // Embedded poll (question + options). Votes live in poll_votes.
  poll?: Poll | null
  savedByCurrentUser: boolean
}

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

// A follow request sent to a private account. Accepted requests become a
// Follow (the DB trigger inserts the follows row).
export interface FollowRequest {
  id: string
  requesterId: string
  targetId: string
  status: "pending" | "accepted" | "rejected"
  createdAt: string // ISO
}

export type ToastTone = "success" | "error" | "info"
export type ToastKind = "success" | "error" | "info"

// Reasons a user can flag a post for moderation (mirrors reports.reason CHECK).
export type ReportReason = "spam" | "harassment" | "misinformation" | "inappropriate" | "other"

// ─── Chat ────────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string
  // The other participant (this user's perspective is always "me").
  otherUserId: string
  createdAt: string // ISO
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string // ISO
}