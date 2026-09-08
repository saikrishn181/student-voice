// Converts raw Postgres/Supabase DB rows into clean typed objects consumed by state stores.

import type { Category, Comment, MediaType, Post, Profile, User } from "@/lib/types"
import { categoryFromHashtags } from "@/lib/utils"

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
  is_anonymous?: boolean | null
  is_followers_only?: boolean | null
  friends_also?: boolean | null
  is_resolved?: boolean | null
  resolved_at?: string | null
  resolution_note?: string | null
  created_at: string
}

export interface ViewerContext {
  currentUserId?: string | null
  isAdmin?: boolean
  isFriend?: boolean
}

export function sanitizePostForViewer(
  post: Post,
  currentUserId?: string | null,
  isAdmin = false,
  isFriend = false,
): Post {
  if (!post.isAnonymous) return post
  const isSelf = Boolean(currentUserId && post.authorId === currentUserId)
  if (isSelf || isAdmin || (post.friendsAlso && isFriend)) {
    return post
  }
  return {
    ...post,
    authorId: "anonymous",
  }
}

export function rowToPost(row: PostRow, viewerContext?: ViewerContext | number): Post {
  const context = typeof viewerContext === "object" && viewerContext !== null ? viewerContext : undefined
  const rawPoll = row.poll_json as {
    question?: string
    options?: string[]
    ends_at?: string
  } | null
  const post: Post = {
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
    isAnonymous: Boolean(row.is_anonymous),
    isFollowersOnly: Boolean(row.is_followers_only),
    friendsAlso: Boolean(row.friends_also),
    isResolved: Boolean(row.is_resolved),
    resolvedAt: row.resolved_at ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
  }

  return sanitizePostForViewer(
    post,
    context?.currentUserId,
    context?.isAdmin,
    context?.isFriend,
  )
}

function cleanAvatarUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined
  const trimmed = url.trim()
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return undefined
  return trimmed
}

export function rowToUser(row: Profile): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? undefined,
    accountType: row.account_type,
    organizationType: row.organization_type ?? undefined,
    verificationStatus: row.verification_status ?? undefined,
    avatarUrl: cleanAvatarUrl(row.avatar_url),
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
  is_official_response?: boolean | null
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
    isOfficialResponse: Boolean(row.is_official_response),
    createdAt: row.created_at,
  }
}
