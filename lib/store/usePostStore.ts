"use client"

// Post store: posts, comments, and follow relationships.
//
// NOTE: support/follow counts update reactively because they live in this
// store. In a later phase this becomes a Supabase mutation; the store actions
// are the exact seams where those calls will swap in.
import { create } from "zustand"

import { MOCK_COMMENTS, MOCK_FOLLOWS, MOCK_POSTS } from "@/lib/mockData"
import type { Category, Comment, Follow, MediaType, Post } from "@/lib/types"

interface PostState {
  posts: Post[]
  comments: Comment[]
  follows: Follow[]

  addPost: (input: {
    authorId: string
    text: string
    mediaUrl?: string | null
    mediaType: MediaType
    state: string
    district: string
    category: Category
  }) => string // returns new post id (for redirect)

  toggleSupport: (postId: string) => void
  addComment: (postId: string, authorId: string, text: string, isOrgHelp?: boolean) => void
  toggleFollow: (followerId: string, followingId: string) => void
}

let commentCounter = 0

export const usePostStore = create<PostState>()((set) => ({
  posts: MOCK_POSTS,
  comments: MOCK_COMMENTS,
  follows: MOCK_FOLLOWS,

  addPost: (input) => {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const newPost: Post = {
      id,
      authorId: input.authorId,
      text: input.text,
      mediaUrl: input.mediaUrl ?? null,
      mediaType: input.mediaType,
      mediaAspectRatio: null,
      state: input.state,
      district: input.district,
      category: input.category,
      supportCount: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      supportedByCurrentUser: false,
    }
    // TODO: real Supabase insert into `posts` table here.
    set((s) => ({ posts: [newPost, ...s.posts] }))
    return id
  },

  toggleSupport: (postId) =>
    set((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              supportCount: p.supportCount + (p.supportedByCurrentUser ? -1 : 1),
              supportedByCurrentUser: !p.supportedByCurrentUser,
            }
          : p,
      ),
    })),

  addComment: (postId, authorId, text, isOrgApp = false) =>
    set((s) => {
      const comment: Comment = {
        id: `c_${++commentCounter}`,
        postId,
        authorId,
        text,
        isOrgHelp: isOrgApp,
        createdAt: new Date().toISOString(),
      }
      return {
        // TODO: store insert into the `comments` table here.
        comments: [...s.comments, comment],
        posts: s.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
        ),
      }
    }),

  toggleFollow: (followerId, followingId) =>
    set((s) => {
      const exists = s.follows.some(
        (f) => f.followerId === followerId && f.followingId === followingId,
      )
      if (exists) {
        // TODO: Supabase DELETE from `follows`.
        return { follows: s.follows.filter((f) => !(f.followerId === followerId && f.followingId === followingId)) }
      }
      // TODO: Supabase INSERT or UPSERT into `follows`.
      return { follows: [...s.follows, { followerId, followingId }] }
    }),
}))