// Shared row-to-model mappers for Supabase → app types. Centralised here so
// every page/store that reads posts, users, or comments uses the same mapping logic.

import type { Category, Comment, MediaType, Post, Profile, User } from "@/lib/types"
import { categoryFromHashtags } from "@/lib/utils"

// Row shape returned by `supabase.from("posts").select("*")`.
export interface PostRow {
  id: string
  author_id: string
  text: string
  media_url: string | null
  media_type: MediaType | null
  media_aspect_ratio: number | null
  state: string | null
  category?: Category
  hashtags: string[] | null
  support_count: number
  comment_count: number
  is_pinned: boolean
  updated_at: string | null
  view_count: number
  scheduled_for: string | null
  event_at: string | null
  event_location: string | null
  poll_json: unknown | null
  content_warning: string | null
  created_at: string
}

// Map a Supabase `posts` row (snake_case) to the app's Post type (camelCase).
export function rowToPost(row: PostRow): Post {
  const rawPoll = row.poll_json as {
    question?: string
    options?: string[]
    ends_at?: string
  } | null
  return {
    id: row.id,
    authorId: row.author_id,
    text: row.text,
    mediaUrl: row.media_url,
    mediaType: (row.media_type as Post["mediaType"]) ?? null,
    mediaAspectRatio: row.media_aspect_ratio,
    state: row.state ?? "",
    category: row.category ?? categoryFromHashtags(row.hashtags ?? []),
    hashtags: row.hashtags ?? [],
    supportCount: row.support_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    supportedByCurrentUser: false,
    isPinned: row.is_pinned,
    editedAt: row.updated_at ?? undefined,
    viewCount: row.view_count,
    scheduledFor: row.scheduled_for ?? undefined,
    eventAt: row.event_at ?? undefined,
    eventLocation: row.event_location ?? undefined,
    poll:
      rawPoll && Array.isArray(rawPoll.options) && rawPoll.options.length > 0
        ? {
            question: rawPoll.question ?? "",
            options: rawPoll.options,
            endsAt: rawPoll.ends_at ?? undefined,
          }
        : null,
    savedByCurrentUser: false,
    contentWarning: row.content_warning ?? undefined,
  }
}

// Map a Supabase `profiles` row to the app's User type.
export function rowToUser(row: Profile): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? undefined,
    accountType: row.account_type,
    organizationType: row.organization_type ?? undefined,
    verificationStatus: row.verification_status ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    state: row.state ?? undefined,
    bio: row.bio ?? undefined,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    createdAt: row.created_at,
    isAdmin: row.is_admin,
    isPrivate: row.is_private,
    collegeVerified: row.college_verified,
    collegeName: row.college_name ?? undefined,
    collegeEmail: row.college_email ?? undefined,
    inviteCode: row.invite_code ?? undefined,
    strikeCount: row.strike_count ?? 0,
    isBanned: row.is_banned ?? false,
    bannedUntil: row.banned_until ?? undefined,
    banReason: row.ban_reason ?? undefined,
  }
}

export interface CommentRow {
  id: string
  post_id: string
  author_id: string
  content: string
  is_org_help: boolean
  created_at: string
}

// Map a Supabase `comments` row to the app's Comment type.
export function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    text: row.content,
    isOrgHelp: row.is_org_help,
    createdAt: row.created_at,
  }
}
