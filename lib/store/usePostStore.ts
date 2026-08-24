"use client"

// Post store backed by Supabase. Holds posts, comments, and follows in memory
// after an initial fetch; every mutation writes through to Supabase so data
// survives reloads. RLS lets everyone read and sign in users write.
import { create } from "zustand"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { deletePostMedia } from "@/lib/supabase/storage"
import { FEED_PAGE_SIZE } from "@/constants"
import { useUserStore } from "./useUserStore"
import type { Category, Comment, Follow, FollowRequest, MediaType, Post, ReportReason } from "@/lib/types"
import { categoryFromHashtags } from "@/lib/utils"
import { checkInappropriateContent, processPostViolation, checkUserBanStatus, scanPostContent, isTopicTrending, autoBlurPost, sendModerationNotification } from "@/lib/moderation"
import { rowToPost, rowToComment, type PostRow, type CommentRow } from "@/lib/mappers"

// Represents a row from the `profiles` table.
interface BlockRow {
  blocked_id: string
}

// Visible posts: not scheduled for the future. PostgREST `now` is UTC.
function visiblePostsQuery() {
  const supabase = createSupabaseBrowserClient()
  return supabase
    .from("posts")
    .select("*")
    .or("scheduled_for.is.null,scheduled_for.lte.now")
}

function rowToFollow(row: {
  follower_id: string
  following_id: string
  created_at: string
}): Follow {
  return { followerId: row.follower_id, followingId: row.following_id }
}

function rowToFollowRequest(row: {
  id: string
  requester_id: string
  target_id: string
  status: string
  created_at: string
}): FollowRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    targetId: row.target_id,
    status: row.status as FollowRequest["status"],
    createdAt: row.created_at,
  }
}

interface PostState {
  posts: Post[]
  comments: Comment[]
  follows: Follow[]
  // Follow requests involving the current user (sent to me / sent by me).
  followRequests: FollowRequest[]

  // Hashtag topics the current user follows (explore + feed "Following" tab).
  followedTopics: string[]

  // Per-post in-flight guard for the optimistic support toggle.
  supportLocks: Record<string, boolean>

  // User ids the current user has blocked; their posts are hidden everywhere.
  blockedUserIds: string[]

  status: "idle" | "loading" | "ready" | "error"
  loadErrorMessage: string | null
  // True when the last page returned fewer rows than the page size (no more).
  hasMore: boolean
  // How many posts are already loaded (for range() pagination).
  loadedCount: number

  loadAll: (currentUserId?: string) => Promise<void>
  loadMore: (currentUserId?: string) => Promise<boolean>
  loadFollowRequests: (currentUserId?: string) => Promise<void>
  sendFollowRequest: (targetId: string, requesterId: string) => Promise<void>
  loadFollowedTopics: (currentUserId?: string) => Promise<void>
  toggleFollowTopic: (tag: string, currentUserId: string) => Promise<void>
  // Accepts or rejects an incoming request. Accepting creates the follow row
  // via the DB trigger; we refresh follows + requests afterwards.
  respondToFollowRequest: (requestId: string, accept: boolean) => Promise<void>
  addPost: (input: {
    authorId: string
    text: string
    mediaUrl?: string | null
    mediaType: MediaType
    mediaAspectRatio?: number | null
    state: string
    hashtags: string[]
    scheduledFor?: string | null
    eventAt?: string | null
    eventLocation?: string | null
    poll?: Post["poll"]
    contentWarning?: string | null
  }) => Promise<Post>
  updatePost: (id: string, input: {
    text: string
    mediaUrl?: string | null
    mediaType: MediaType
    mediaAspectRatio?: number | null
    state?: string
    hashtags: string[]
    eventAt?: string | null
    eventLocation?: string | null
    poll?: Post["poll"]
    contentWarning?: string | null
  }) => Promise<void>
  deletePost: (id: string) => Promise<void>
  toggleSave: (postId: string, currentUserId: string) => Promise<void>
  setPostPinned: (postId: string, pinned: boolean) => Promise<void>
  toggleSupport: (postId: string, currentUserId: string) => Promise<void>
  addComment: (postId: string, authorId: string, text: string, isOrgHelp?: boolean) => Promise<void>
  updateComment: (postId: string, commentId: string, text: string) => Promise<void>
  deleteComment: (postId: string, commentId: string) => Promise<void>
  toggleFollow: (followerId: string, followingId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  reportPost: (postId: string, reason: ReportReason, details?: string) => Promise<void>

  // Live sync: starts/stops a Supabase Realtime channel so new posts and count
  // changes appear without reloading. Requires realtime enabled (schema.sql).
  startRealtime: (currentUserId?: string) => void
  stopRealtime: () => void
  realtimeChannel: RealtimeChannel | null
}

export const usePostStore = create<PostState>()((set, get) => ({
  posts: [],
  comments: [],
  follows: [],
  followRequests: [],
  followedTopics: [],
  supportLocks: {},
  blockedUserIds: [],
  realtimeChannel: null,

  status: "idle",
  loadErrorMessage: null,
  hasMore: false,
  loadedCount: 0,

  loadAll: async (currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    set({ status: "loading", loadErrorMessage: null, hasMore: false, loadedCount: 0 })

    const { data: postRows, error: postsError } = await visiblePostsQuery()
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(0, FEED_PAGE_SIZE - 1)

    if (postsError) {
      set({ status: "error", loadErrorMessage: postsError.message })
      return
    }

    const postIds = (postRows ?? []).map((r) => r.id)
    const [{ data: commentRows }, { data: followRows }] = await Promise.all([
      postIds.length > 0
        ? supabase.from("comments").select("*").in("post_id", postIds).order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from("follows").select("*"),
    ])

    // Follow requests involving the current user (sent by me / sent to me).
    let requestRows: Parameters<typeof rowToFollowRequest>[0][] = []
    if (currentUserId) {
      const { data } = await supabase
        .from("follow_requests")
        .select("*")
        .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`)
      requestRows = (data ?? []) as Parameters<typeof rowToFollowRequest>[0][]
    }

    // supportedByCurrentUser requires knowing the current user's supports.
    let supportedIds = new Set<string>()
    // Same for bookmarks: savedByCurrentUser comes from post_saves.
    let savedIds = new Set<string>()
    if (currentUserId) {
      const { data: mySupports } = await supabase
        .from("post_supports")
        .select("post_id")
        .eq("user_id", currentUserId)
      supportedIds = new Set((mySupports ?? []).map((r) => r.post_id))
      const { data: mySaves } = await supabase
        .from("post_saves")
        .select("post_id")
        .eq("user_id", currentUserId)
      savedIds = new Set((mySaves ?? []).map((r) => r.post_id))
    }

    // Blocked authors are hidden from the feed, trending, and suggestions.
    let blockedUserIds = new Set<string>()
    if (currentUserId) {
      const { data: myBlocks } = await supabase
        .from("blocks")
        .select("blocked_id")
        .eq("blocker_id", currentUserId)
      blockedUserIds = new Set((myBlocks ?? []).map((r) => (r as BlockRow).blocked_id))
    }

    const posts = ((postRows ?? []) as PostRow[])
      .filter((row) => !blockedUserIds.has(row.author_id))
      .map((row) => {
        const post = rowToPost(row)
        post.supportedByCurrentUser = supportedIds.has(post.id)
        post.savedByCurrentUser = savedIds.has(post.id)
        return post
      })

    // Prefetch every author up front so name/avatar fields never flash
    // "Unknown" while useUserById lazily loads a single profile.
    prefetchAuthors(posts.map((p) => p.authorId))
    if (commentRows?.length) {
      prefetchAuthors(
        (commentRows as Parameters<typeof rowToComment>[0][]).map((r) => r.author_id),
      )
    }

    set({
      blockedUserIds: Array.from(blockedUserIds),
      posts,
      comments: (commentRows ?? []).map((row) =>
        rowToComment(row as Parameters<typeof rowToComment>[0]),
      ),
      follows: (followRows ?? []).map((row) =>
        rowToFollow(row as Parameters<typeof rowToFollow>[0]),
      ),
      followRequests: requestRows.map(rowToFollowRequest),
      status: "ready",
      hasMore: (postRows?.length ?? 0) >= FEED_PAGE_SIZE,
      loadedCount: posts.length,
    })
    if (currentUserId) void get().loadFollowedTopics(currentUserId)
  },

  loadMore: async (currentUserId) => {
    const { posts, hasMore, status } = get()
    if (!hasMore || status !== "ready") return false

    // Keyset (cursor) pagination: fetch strictly older than the last loaded
    // post. Ties on created_at are broken by id (uuid), which stays stable
    // even if new posts arrive while paging.
    const last = posts[posts.length - 1]
    if (!last) return false

    const supabase = createSupabaseBrowserClient()
    // Single combined filter: visibility (scheduled_for must be null or past)
    // AND keyset cursor. Built as one .or() so postgrest-js never drops the
    // visibility clause when chaining a second .or().
    const visA = "scheduled_for.is.null"
    const visB = "scheduled_for.lte.now"
    const { data: postRows, error } = await supabase
      .from("posts")
      .select("*")
      .or(
        `and(${visA},created_at.lt.${last.createdAt}),` +
          `and(${visB},created_at.lt.${last.createdAt}),` +
          `and(${visA},created_at.eq.${last.createdAt},id.lt.${last.id}),` +
          `and(${visB},created_at.eq.${last.createdAt},id.lt.${last.id})`,
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(FEED_PAGE_SIZE)

    if (error) return false

    const existingIds = new Set(get().posts.map((p) => p.id))
    const blockedIds = new Set(get().blockedUserIds)
    const newPosts = ((postRows ?? []) as PostRow[])
      .filter((row) => !existingIds.has(row.id) && !blockedIds.has(row.author_id))
      .map((row) => rowToPost(row))

    // Prefetch authors of the newly loaded posts as well.
    if (newPosts.length > 0) prefetchAuthors(newPosts.map((p) => p.authorId))

    // Mark supportedByCurrentUser for the newly loaded posts.
    if (currentUserId && newPosts.length > 0) {
      const { data: mySupports } = await supabase
        .from("post_supports")
        .select("post_id")
        .eq("user_id", currentUserId)
      const supportedIds = new Set((mySupports ?? []).map((r) => r.post_id))
      const { data: mySaves } = await supabase
        .from("post_saves")
        .select("post_id")
        .eq("user_id", currentUserId)
      const savedIds = new Set((mySaves ?? []).map((r) => r.post_id))
      newPosts.forEach((p) => {
        p.supportedByCurrentUser = supportedIds.has(p.id)
        p.savedByCurrentUser = savedIds.has(p.id)
      })
    }

    set((s) => ({
      posts: [...s.posts, ...newPosts],
      hasMore: newPosts.length > 0 && (postRows?.length ?? 0) >= FEED_PAGE_SIZE,
      loadedCount: s.loadedCount + newPosts.length,
    }))
    return true
  },

  addPost: async (input) => {
    const supabase = createSupabaseBrowserClient()

    // 1. Pre-check ban status
    const { data: authorProfile } = await supabase
      .from("profiles")
      .select("is_banned, banned_until, strike_count")
      .eq("id", input.authorId)
      .maybeSingle()

    if (authorProfile?.is_banned) {
      const banStatus = checkUserBanStatus({
        id: input.authorId,
        name: "",
        email: "",
        accountType: "student",
        followerCount: 0,
        followingCount: 0,
        createdAt: "",
        isAdmin: false,
        isBanned: authorProfile.is_banned,
        bannedUntil: authorProfile.banned_until ?? undefined,
        strikeCount: authorProfile.strike_count,
      })
      if (banStatus.isBanned) {
        throw new Error(
          banStatus.isPermanent
            ? "Your account has been permanently banned due to repeated guideline strikes."
            : `Your account is temporarily suspended (${banStatus.remainingDays} days remaining).`
        )
      }
    }

    // 2. Insert post
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: input.authorId,
        text: input.text,
        media_url: input.mediaUrl ?? null,
        media_type: input.mediaType ?? null,
        media_aspect_ratio: input.mediaAspectRatio ?? null,
        state: input.state,
        category: categoryFromHashtags(input.hashtags),
        hashtags: input.hashtags,
        scheduled_for: input.scheduledFor ?? null,
        event_at: input.eventAt ?? null,
        event_location: input.eventLocation ?? null,
        content_warning: input.contentWarning ?? null,
        poll_json: input.poll
          ? {
              question: input.poll.question,
              options: input.poll.options,
              ends_at: input.poll.endsAt ?? null,
            }
          : null,
      })
      .select("*")
      .single()

    if (error || !data) throw new Error(error?.message ?? "Could not publish post")

    // 3. Enhanced Post-Upload NSFW / Inappropriate Content Detection Scan
    //    - User self-tagged NSFW (contentWarning="nsfw") → SKIP scan, keep post as-is
    //    - Full NSFW / profanity / hate speech → auto-DELETE + strike + in-app notification
    //    - Partial NSFW on trending/important topic → auto-BLUR (not delete) + notify (no strike)
    //    - Partial NSFW on non-trending topic → auto-DELETE + strike + notify
    const userSelfTaggedNsfw = input.contentWarning === "nsfw"
    const scan = scanPostContent(input.text, input.hashtags, userSelfTaggedNsfw)

    if (scan.severity === "full_nsfw") {
      // Full NSFW: always delete + strike + notify
      const strikeRes = await processPostViolation(data.id, input.authorId, scan.message)
      throw new Error(strikeRes.message)
    }

    if (scan.severity === "partial_nsfw") {
      // Check if the topic is trending/important
      const trending = isTopicTrending(input.hashtags)

      if (trending) {
        // Trending topic: auto-blur the post instead of deleting
        await autoBlurPost(data.id)
        // Send content_warning notification (no strike)
        await sendModerationNotification(input.authorId, "content_warning", data.id, {
          reason: scan.message,
          action: "blurred",
          category: scan.category ?? "nsfw",
        })
        // Return the post with contentWarning applied
        const post = rowToPost(data as PostRow)
        const blurredPost = { ...post, contentWarning: "nsfw" }
        set((s) => ({ posts: [blurredPost, ...s.posts] }))
        return blurredPost
      } else {
        // Non-trending: delete + strike + notify
        const strikeRes = await processPostViolation(data.id, input.authorId, scan.message)
        throw new Error(strikeRes.message)
      }
    }

    const post = rowToPost(data as PostRow)
    set((s) => ({ posts: [post, ...s.posts] }))
    return post
  },

  updatePost: async (id, input) => {
    const supabase = createSupabaseBrowserClient()
    const previous = get().posts.find((p) => p.id === id)
    const { data, error } = await supabase
      .from("posts")
      .update({
        text: input.text,
        media_url: input.mediaUrl ?? null,
        media_type: input.mediaType ?? null,
        media_aspect_ratio: input.mediaAspectRatio ?? null,
        state: input.state ?? previous?.state ?? "",
        category: categoryFromHashtags(input.hashtags),
        hashtags: input.hashtags,
        updated_at: new Date().toISOString(),
        event_at: input.eventAt ?? null,
        event_location: input.eventLocation ?? null,
        content_warning: input.contentWarning ?? null,
        poll_json: input.poll
          ? {
              question: input.poll.question,
              options: input.poll.options,
              ends_at: input.poll.endsAt ?? null,
            }
          : null,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error || !data) throw new Error(error?.message ?? "Could not update post")
    // Media replaced or removed → delete the old file so storage stays clean.
    if (previous?.mediaUrl && previous.mediaUrl !== input.mediaUrl) {
      void deletePostMedia(previous.mediaUrl)
    }
    const post = rowToPost(data as PostRow)
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? post : p)),
      comments: s.comments, // unchanged
    }))
  },

  deletePost: async (id) => {
    const supabase = createSupabaseBrowserClient()
    const post = get().posts.find((p) => p.id === id)
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (error) throw new Error(error.message ?? "Could not delete post")
    if (post?.mediaUrl) void deletePostMedia(post.mediaUrl)
    set((s) => ({
      posts: s.posts.filter((p) => p.id !== id),
      comments: s.comments.filter((c) => c.postId !== id),
      follows: s.follows,
    }))
  },

  toggleSave: async (postId, currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    const post = get().posts.find((p) => p.id === postId)
    if (!post) return

    const saved = post.savedByCurrentUser
    // Optimistic toggle for snappy UI; reverted on failure.
    set((s) => ({
      posts: s.posts.map((p) => (p.id === postId ? { ...p, savedByCurrentUser: !saved } : p)),
    }))
    try {
      if (saved) {
        const { error } = await supabase
          .from("post_saves")
          .delete()
          .eq("user_id", currentUserId)
          .eq("post_id", postId)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.from("post_saves").insert({ user_id: currentUserId, post_id: postId })
        if (error) throw new Error(error.message)
      }
    } catch (err) {
      set((s) => ({
        posts: s.posts.map((p) => (p.id === postId ? { ...p, savedByCurrentUser: saved } : p)),
      }))
      throw err instanceof Error ? err : new Error("Could not update bookmark")
    }
  },

  setPostPinned: async (postId, pinned) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("posts")
      .update({ is_pinned: pinned })
      .eq("id", postId)
    if (error) throw new Error("Could not update pin — please try again")
    set((s) => ({
      posts: s.posts.map((p) => (p.id === postId ? { ...p, isPinned: pinned } : p)),
    }))
  },

  toggleSupport: async (postId, currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    const { posts, supportLocks } = get()
    // In-flight lock: ignore double-clicks while a toggle is still pending.
    if (supportLocks[postId]) return
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const supported = post.supportedByCurrentUser
    const original = { supportCount: post.supportCount, supportedByCurrentUser: supported }

    // Optimistic update for snappy UI.
    set({
      supportLocks: { ...get().supportLocks, [postId]: true },
      posts: posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              supportCount: Math.max(p.supportCount + (supported ? -1 : 1), 0),
              supportedByCurrentUser: !supported,
            }
          : p,
      ),
    })

    try {
      if (supported) {
        const { error } = await supabase
          .from("post_supports")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", currentUserId)
        if (error) throw new Error("Could not remove support")
      } else {
        const { error } = await supabase.from("post_supports").insert({ post_id: postId, user_id: currentUserId })
        if (error) throw new Error("Could not add support")
      }
    } catch (err) {
      // Revert the optimistic change on failure so the UI never lies.
      set((s) => ({
        posts: s.posts.map((p) =>
          p.id === postId
            ? {
                ...p,
                supportCount: original.supportCount,
                supportedByCurrentUser: original.supportedByCurrentUser,
              }
            : p,
        ),
      }))
      throw err instanceof Error ? err : new Error("Could not update support")
    } finally {
      set((s) => {
        const next = { ...s.supportLocks }
        delete next[postId]
        return { supportLocks: next }
      })
    }
  },

  addComment: async (postId, authorId, text, isOrgHelp = false) => {
    const moderation = checkInappropriateContent(text)
    if (!moderation.isAllowed) {
      throw new Error(moderation.message)
    }

    const supabase = createSupabaseBrowserClient()
    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: authorId,
      content: text,
      is_org_help: isOrgHelp,
    })
    if (insertError) {
      // Server rejection (e.g. the comment spam guard) → show its message.
      throw new Error(
        insertError.message?.includes("too many") ? insertError.message : "Failed to post comment",
      )
    }
    await reloadComments(postId)
  },

  updateComment: async (postId, commentId, text) => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("You need to be logged in")
    const { error } = await supabase
      .from("comments")
      .update({ content: text.trim() })
      .eq("id", commentId)
      .eq("author_id", user.id)
    if (error) throw new Error("Failed to update comment")
    await reloadComments(postId)
  },

  deleteComment: async (postId, commentId) => {
    const supabase = createSupabaseBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("You need to be logged in")
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("author_id", user.id)
    if (error) throw new Error("Failed to delete comment")
    await reloadComments(postId)
  },

  toggleFollow: async (followerId, followingId) => {
    const supabase = createSupabaseBrowserClient()
    const { follows } = get()
    const exists = follows.some((f) => f.followerId === followerId && f.followingId === followingId)

    if (exists) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId)
      if (error) throw new Error("Could not unfollow — please try again")
      set((s) => ({
        follows: s.follows.filter(
          (f) => !(f.followerId === followerId && f.followingId === followingId),
        ),
      }))
      adjustFollowCounts(followerId, followingId, -1)
    } else {
      const { error } = await supabase
        .from("follows")
        .upsert({ follower_id: followerId, following_id: followingId })
      if (error) throw new Error("Could not follow — please try again")
      set((s) => ({
        follows: [...s.follows, { followerId, followingId }],
      }))
      adjustFollowCounts(followerId, followingId, +1)
    }
  },

  loadFollowRequests: async (currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    if (!currentUserId) {
      set({ followRequests: [] })
      return
    }
    const { data } = await supabase
      .from("follow_requests")
      .select("*")
      .or(`requester_id.eq.${currentUserId},target_id.eq.${currentUserId}`)
    set({
      followRequests: ((data ?? []) as Parameters<typeof rowToFollowRequest>[0][]).map(
        rowToFollowRequest,
      ),
    })
  },

  loadFollowedTopics: async (currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    if (!currentUserId) {
      set({ followedTopics: [] })
      return
    }
    const { data } = await supabase
      .from("followed_topics")
      .select("tag")
      .eq("user_id", currentUserId)
    set({ followedTopics: ((data ?? []) as { tag: string }[]).map((r) => r.tag) })
  },

  toggleFollowTopic: async (tag, currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    const followed = get().followedTopics.includes(tag)
    // Optimistic toggle; reverted on failure.
    set((s) => ({
      followedTopics: followed
        ? s.followedTopics.filter((t) => t !== tag)
        : [...s.followedTopics, tag],
    }))
    try {
      if (followed) {
        const { error } = await supabase
          .from("followed_topics")
          .delete()
          .eq("user_id", currentUserId)
          .eq("tag", tag)
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase
          .from("followed_topics")
          .insert({ user_id: currentUserId, tag })
        if (error) throw new Error(error.message)
      }
    } catch (err) {
      set((s) => ({
        followedTopics: followed
          ? [...s.followedTopics, tag]
          : s.followedTopics.filter((t) => t !== tag),
      }))
      throw err instanceof Error ? err : new Error("Could not update topic")
    }
  },

  sendFollowRequest: async (targetId, requesterId) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from("follow_requests").insert({
      requester_id: requesterId,
      target_id: targetId,
    })
    if (error) {
      if (error.message.includes("duplicate")) {
        // Already requested — refresh state and continue silently.
        await get().loadFollowRequests(requesterId)
        return
      }
      throw new Error("Could not send follow request — please try again")
    }
    // Refresh so the new request shows up in the list.
    await get().loadFollowRequests(requesterId)
  },

  respondToFollowRequest: async (requestId, accept) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase
      .from("follow_requests")
      .update({ status: accept ? "accepted" : "rejected" })
      .eq("id", requestId)
    if (error) throw new Error("Could not update the request — please try again")

    const currentUserId = useAuthStore.getState().currentUser?.id
    // Accepting creates the follows row via DB trigger; reload both lists.
    if (currentUserId) {
      const { data: followRows } = await supabase.from("follows").select("*")
      set({
        follows: (followRows ?? []).map((row) =>
          rowToFollow(row as Parameters<typeof rowToFollow>[0]),
        ),
      })
      await get().loadFollowRequests(currentUserId)
    }
  },

  blockUser: async (userId) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId || currentUserId === userId) return
    const { error } = await supabase
      .from("blocks")
      .insert({ blocker_id: currentUserId, blocked_id: userId })
    if (error) throw new Error("Could not block this user")
    set((s) => ({
      blockedUserIds: [...s.blockedUserIds, userId],
      // Drop their posts from the feed immediately.
      posts: s.posts.filter((p) => p.authorId !== userId),
      // And any follows pointing at them.
      follows: s.follows.filter((f) => f.followingId !== userId),
    }))
  },

  unblockUser: async (userId) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", userId)
    if (error) throw new Error("Could not unblock this user")
    set((s) => ({ blockedUserIds: s.blockedUserIds.filter((id) => id !== userId) }))
  },

  reportPost: async (postId, reason, details) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return
    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      post_id: postId,
      reason,
      details: details?.trim() || null,
    })
    if (error) throw new Error("Could not submit the report — please try again")
  },

  startRealtime: (currentUserId) => {
    const { realtimeChannel } = get()
    if (realtimeChannel) return
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel("post-feed")
      // New posts -> prepend (supabase realtime delivers them newest-first in
      // practice; we slot them by created_at to be safe).
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const row = payload.new as PostRow
          if (!row?.id) return
          const existing = get().posts.some((p) => p.id === row.id)
          const blocked = get().blockedUserIds.includes(row.author_id)
          // Scheduled posts only appear in feeds once their time arrives.
          if (existing || blocked) return
          if (row.scheduled_for && new Date(row.scheduled_for).getTime() > Date.now()) return
          const post = rowToPost(row)
          // supportedByCurrentUser: fresh posts can't have my support yet.
          post.supportedByCurrentUser = false
          set((s) => ({
            posts: [...s.posts, post].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            ),
          }))
          prefetchAuthors([row.author_id])
        },
      )
      // Counts (supports/comments) on an existing post -> patch in place.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload) => {
          const row = payload.new as PostRow
          if (!row?.id) return
          set((s) => ({
            posts: s.posts.map((p) =>
              p.id === row.id
                ? {
                    ...p,
                    supportCount: row.support_count,
                    commentCount: row.comment_count,
                    viewCount: row.view_count,
                    isPinned: row.is_pinned,
                    editedAt: row.updated_at ?? undefined,
                    contentWarning: row.content_warning ?? undefined,
                  }
                : p,
            ),
          }))
        },
      )
      // Deleted post -> drop from list.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        (payload) => {
          const old = payload.old as { id: string }
          if (!old?.id) return
          set((s) => ({ posts: s.posts.filter((p) => p.id !== old.id) }))
        },
      )

    // A support toggle from *another* tab for the current user also updates
    // supportedByCurrentUser here so the heart stays in sync.
    if (currentUserId) {
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "post_supports",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const row = payload.new as { post_id: string }
          if (!row?.post_id) return
          set((s) => ({
            posts: s.posts.map((p) =>
              p.id === row.post_id ? { ...p, supportedByCurrentUser: true } : p,
            ),
          }))
        },
      )
      channel.on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "post_supports",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const old = payload.old as { post_id: string }
          if (!old?.post_id) return
          set((s) => ({
            posts: s.posts.map((p) =>
              p.id === old.post_id ? { ...p, supportedByCurrentUser: false } : p,
            ),
          }))
        },
      )
    }

    set({ realtimeChannel: channel })
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        // Real-time may be disabled in the project (no publication entry);
        // the feed keeps working via normal fetches.
        set({ realtimeChannel: null })
        supabase.removeChannel(channel)
      }
    })
  },

  stopRealtime: () => {
    const { realtimeChannel } = get()
    if (!realtimeChannel) return
    const supabase = createSupabaseBrowserClient()
    supabase.removeChannel(realtimeChannel)
    set({ realtimeChannel: null })
  },
}))

// Resolve a batch of author profiles into the shared cache in parallel. Skips
// ids already cached (or equal to the current user) and fires-and-forgets.
function prefetchAuthors(ids: string[]) {
  const currentUserId = useAuthStore.getState().currentUser?.id
  const missing = Array.from(new Set(ids)).filter(
    (id) => id !== currentUserId && !useUserStore.getState().users[id],
  )
  if (missing.length === 0) return
  missing.forEach((id) => {
    void useUserStore.getState().loadById(id)
  })
}

// Refetch every comment for a post and sync both the list and post.commentCount
// (the DB trigger keeps the count on the posts row; this keeps the UI honest).
async function reloadComments(postId: string) {
  const supabase = createSupabaseBrowserClient()
  const { data: commentRows, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
  if (error) throw new Error("Could not refresh comments")
  const comments = (commentRows ?? []).map((row) =>
    rowToComment(row as Parameters<typeof rowToComment>[0]),
  )
  usePostStore.setState((s) => ({
    comments: [...s.comments.filter((c) => c.postId !== postId), ...comments],
    posts: s.posts.map((p) => (p.id === postId ? { ...p, commentCount: comments.length } : p)),
  }))
}

// Mirror a follow/unfollow into the cached follower/following counts so the
// UI reflects the change instantly (the DB trigger keeps the source of truth).
function adjustFollowCounts(followerId: string, followingId: string, delta: -1 | 1) {
  useUserStore.setState((s) => {
    const users = { ...s.users }
    const follower = users[followerId]
    const following = users[followingId]
    if (follower) {
      users[followerId] = { ...follower, followingCount: Math.max(follower.followingCount + delta, 0) }
    }
    if (following) {
      users[followingId] = { ...following, followerCount: Math.max(following.followerCount + delta, 0) }
    }
    return { users }
  })
  const me = useAuthStore.getState().currentUser
  if (me) {
    if (me.id === followerId) {
      useAuthStore.setState({ currentUser: { ...me, followingCount: Math.max(me.followingCount + delta, 0) } })
    } else if (me.id === followingId) {
      useAuthStore.setState({ currentUser: { ...me, followerCount: Math.max(me.followerCount + delta, 0) } })
    }
  }
}