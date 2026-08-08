"use client"

// Post store backed by Supabase. Holds posts, comments, and follows in memory
// after an initial fetch; every mutation writes through to Supabase so data
// survives reloads. RLS lets everyone read and sign in users write.
import { create } from "zustand"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { FEED_PAGE_SIZE } from "@/constants"
import { useUserStore } from "./useUserStore"
import { useAuthStore } from "./useAuthStore"
import type { Category, Comment, Follow, MediaType, Post } from "@/lib/types"

interface PostRow {
  id: string
  author_id: string
  text: string
  media_url: string | null
  media_type: MediaType
  media_aspect_ratio: number | null
  state: string | null
  category: Category
  support_count: number
  comment_count: number
  created_at: string
}

function rowToPost(row: PostRow): Post {
  return {
    id: row.id,
    authorId: row.author_id,
    text: row.text,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    mediaAspectRatio: row.media_aspect_ratio,
    state: row.state ?? "",
    category: row.category,
    supportCount: row.support_count,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    supportedByCurrentUser: false,
  }
}

function rowToComment(row: {
  id: string
  post_id: string
  author_id: string
  content: string
  is_org_help: boolean
  created_at: string
}): Comment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    text: row.content,
    isOrgHelp: row.is_org_help,
    createdAt: row.created_at,
  }
}

function rowToFollow(row: {
  follower_id: string
  following_id: string
  created_at: string
}): Follow {
  return { followerId: row.follower_id, followingId: row.following_id }
}

interface PostState {
  posts: Post[]
  comments: Comment[]
  follows: Follow[]

  status: "idle" | "loading" | "ready" | "error"
  loadErrorMessage: string | null
  // True when the last page returned fewer rows than the page size (no more).
  hasMore: boolean
  // How many posts are already loaded (for range() pagination).
  loadedCount: number

  loadAll: (currentUserId?: string) => Promise<void>
  loadMore: (currentUserId?: string) => Promise<boolean>
  addPost: (input: {
    authorId: string
    text: string
    mediaUrl?: string | null
    mediaType: MediaType
    mediaAspectRatio?: number | null
    state: string
    category: Category
  }) => Promise<Post>
  updatePost: (id: string, input: {
    text: string
    mediaUrl?: string | null
    mediaType: MediaType
    mediaAspectRatio?: number | null
    state: string
    category: Category
  }) => Promise<void>
  deletePost: (id: string) => Promise<void>
  toggleSupport: (postId: string, currentUserId: string) => Promise<void>
  addComment: (postId: string, authorId: string, text: string, isOrgHelp?: boolean) => Promise<void>
  toggleFollow: (followerId: string, followingId: string) => Promise<void>
}

export const usePostStore = create<PostState>()((set, get) => ({
  posts: [],
  comments: [],
  follows: [],

  status: "idle",
  loadErrorMessage: null,
  hasMore: false,
  loadedCount: 0,

  loadAll: async (currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    set({ status: "loading", loadErrorMessage: null, hasMore: false, loadedCount: 0 })

    const { data: postRows, error: postsError } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, FEED_PAGE_SIZE - 1)

    if (postsError) {
      set({ status: "error", loadErrorMessage: postsError.message })
      return
    }

    const [{ data: commentRows }, { data: followRows }] = await Promise.all([
      supabase.from("comments").select("*").order("created_at", { ascending: false }),
      supabase.from("follows").select("*"),
    ])

    // supportedByCurrentUser requires knowing the current user's supports.
    let supportedIds = new Set<string>()
    if (currentUserId) {
      const { data: mySupports } = await supabase
        .from("post_supports")
        .select("post_id")
        .eq("user_id", currentUserId)
      supportedIds = new Set((mySupports ?? []).map((r) => r.post_id))
    }

    const posts = ((postRows ?? []) as PostRow[]).map((row) => {
      const post = rowToPost(row)
      post.supportedByCurrentUser = supportedIds.has(post.id)
      return post
    })

    set({
      posts,
      comments: (commentRows ?? []).map((row) =>
        rowToComment(row as Parameters<typeof rowToComment>[0]),
      ),
      follows: (followRows ?? []).map((row) =>
        rowToFollow(row as Parameters<typeof rowToFollow>[0]),
      ),
      status: "ready",
      hasMore: (postRows?.length ?? 0) >= FEED_PAGE_SIZE,
      loadedCount: posts.length,
    })
  },

  loadMore: async (currentUserId) => {
    const { loadedCount, hasMore, status } = get()
    if (!hasMore || status !== "ready") return false

    const supabase = createSupabaseBrowserClient()
    const from = loadedCount
    const to = loadedCount + FEED_PAGE_SIZE - 1

    const { data: postRows, error } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) return false

    const existingIds = new Set(get().posts.map((p) => p.id))
    const newPosts = ((postRows ?? []) as PostRow[])
      .filter((row) => !existingIds.has(row.id))
      .map((row) => rowToPost(row))

    // Mark supportedByCurrentUser for the newly loaded posts.
    if (currentUserId && newPosts.length > 0) {
      const { data: mySupports } = await supabase
        .from("post_supports")
        .select("post_id")
        .eq("user_id", currentUserId)
      const supportedIds = new Set((mySupports ?? []).map((r) => r.post_id))
      newPosts.forEach((p) => {
        p.supportedByCurrentUser = supportedIds.has(p.id)
      })
    }

    set((s) => ({
      posts: [...s.posts, ...newPosts],
      hasMore: (postRows?.length ?? 0) >= FEED_PAGE_SIZE,
      loadedCount: s.loadedCount + newPosts.length,
    }))
    return true
  },

  addPost: async (input) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: input.authorId,
        text: input.text,
        media_url: input.mediaUrl ?? null,
        media_type: input.mediaType ?? null,
        media_aspect_ratio: input.mediaAspectRatio ?? null,
        state: input.state,
        category: input.category,
      })
      .select("*")
      .single()

    if (error || !data) throw new Error(error?.message ?? "Could not publish post")

    const post = rowToPost(data as PostRow)
    set((s) => ({ posts: [post, ...s.posts] }))
    return post
  },

  updatePost: async (id, input) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("posts")
      .update({
        text: input.text,
        media_url: input.mediaUrl ?? null,
        media_type: input.mediaType ?? null,
        media_aspect_ratio: input.mediaAspectRatio ?? null,
        state: input.state,
        category: input.category,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error || !data) throw new Error(error?.message ?? "Could not update post")
    const post = rowToPost(data as PostRow)
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? post : p)),
      comments: s.comments, // unchanged
    }))
  },

  deletePost: async (id) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from("posts").delete().eq("id", id)
    if (error) throw new Error(error.message ?? "Could not delete post")
    set((s) => ({
      posts: s.posts.filter((p) => p.id !== id),
      comments: s.comments.filter((c) => c.postId !== id),
      follows: s.follows,
    }))
  },

  toggleSupport: async (postId, currentUserId) => {
    const supabase = createSupabaseBrowserClient()
    const { posts } = get()
    const post = posts.find((p) => p.id === postId)
    if (!post) return

    const supported = post.supportedByCurrentUser

    // Optimistic update for snappy UI; reconciled on next load.
    set({
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

    if (supported) {
      await supabase.from("post_supports").delete().eq("post_id", postId).eq("user_id", currentUserId)
    } else {
      await supabase.from("post_supports").insert({ post_id: postId, user_id: currentUserId })
    }
  },

  addComment: async (postId, authorId, text, isOrgHelp = false) => {
    const supabase = createSupabaseBrowserClient()
    const { error: insertError } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: authorId,
      content: text,
      is_org_help: isOrgHelp,
    })
    if (insertError) throw new Error("Failed to post comment")

    // Reload comments for this post so count + list stay in sync.
    const { data: commentRows } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true })
    const comments = (commentRows ?? []).map((row) =>
      rowToComment(row as Parameters<typeof rowToComment>[0]),
    )

    set((s) => ({
      comments: [...s.comments.filter((c) => c.postId !== postId), ...comments],
      posts: s.posts.map((p) =>
        p.id === postId ? { ...p, commentCount: comments.length } : p,
      ),
    }))
  },

  toggleFollow: async (followerId, followingId) => {
    const supabase = createSupabaseBrowserClient()
    const { follows } = get()
    const exists = follows.some((f) => f.followerId === followerId && f.followingId === followingId)

    if (exists) {
      await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId)
      set((s) => ({
        follows: s.follows.filter(
          (f) => !(f.followerId === followerId && f.followingId === followingId),
        ),
      }))
      adjustFollowCounts(followerId, followingId, -1)
    } else {
      await supabase
        .from("follows")
        .upsert({ follower_id: followerId, following_id: followingId })
      set((s) => ({
        follows: [...s.follows, { followerId, followingId }],
      }))
      adjustFollowCounts(followerId, followingId, +1)
    }
  },
}))

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