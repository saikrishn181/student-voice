"use client"

// Post detail page: full PostCard at top, CommentInput + CommentThread below.
// Looks up the post from the shared store; if the store isn't loaded yet
// (e.g. direct link / deep link / refresh) it fetches just what's needed for
// this post instead of showing "not found".
import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { PostCard } from "@/components/feature"
import { CommentInput } from "@/components/feature/CommentInput"
import { CommentThread } from "@/components/feature/CommentThread"
import { Button, EmptyState, Skeleton } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { rowToPost, rowToComment, type PostRow, type CommentRow } from "@/lib/mappers"
import s from "@/lib/strings"

export default function PostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const post = usePostStore((s) => s.posts.find((p) => p.id === params.id))
  const follows = usePostStore((s) => s.follows)
  const [lookingUp, setLookingUp] = useState(!post)
  const [notFound, setNotFound] = useState(false)
  const currentUser = useAuthStore((s) => s.currentUser)

  // If the post is not in the cached feed store (e.g. older post, direct deep link,
  // or after reload), fetch it directly from Supabase instead of showing "not found".
  useEffect(() => {
    if (post) {
      setLookingUp(false)
      setNotFound(false)
      return
    }
    setLookingUp(true)
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    ;(async () => {
      const { data: row } = await supabase
        .from("posts")
        .select("*")
        .eq("id", params.id)
        .maybeSingle()
      if (cancelled) return
      if (!row) {
        setLookingUp(false)
        setNotFound(true)
        return
      }
      // Hydrate the shared store so PostCard/CommentThread work normally.
      const [{ data: commentRows }, { data: supRow }, { data: savRow }] = await Promise.all([
        supabase
          .from("comments")
          .select("*")
          .eq("post_id", params.id)
          .order("created_at", { ascending: true }),
        currentUser?.id
          ? supabase
              .from("post_supports")
              .select("post_id")
              .eq("post_id", params.id)
              .eq("user_id", currentUser.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        currentUser?.id
          ? supabase
              .from("post_saves")
              .select("post_id")
              .eq("post_id", params.id)
              .eq("user_id", currentUser.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      const mappedPost = rowToPost(row as unknown as PostRow, {
        currentUserId: currentUser?.id,
        isAdmin: currentUser?.isAdmin,
      })
      if (supRow) mappedPost.supportedByCurrentUser = true
      if (savRow) mappedPost.savedByCurrentUser = true
      const mappedComments = (commentRows ?? []).map((r) => rowToComment(r as unknown as CommentRow))
      usePostStore.setState((s) => ({
        posts: s.posts.some((p) => p.id === row.id)
          ? s.posts.map((p) => (p.id === row.id ? { ...p, ...mappedPost } : p))
          : [mappedPost, ...s.posts],
        comments: [
          ...s.comments.filter((c) => c.postId !== params.id),
          ...mappedComments,
        ],
      }))
      setLookingUp(false)
      setNotFound(false)
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, post, currentUser?.id, currentUser?.isAdmin])

  // Count this visit: bump view_count once per mount (RLS requires a signed-in
  // user to update, so anonymous visits simply don't count).
  useEffect(() => {
    if (!post || !currentUser) return
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    ;(async () => {
      const { data: row } = await supabase
        .from("posts")
        .select("view_count")
        .eq("id", post.id)
        .maybeSingle()
      if (cancelled || !row) return
      const next = ((row as { view_count?: number }).view_count ?? 0) + 1
      await supabase.from("posts").update({ view_count: next }).eq("id", post.id)
      if (!cancelled) {
        usePostStore.setState((s) => ({
          posts: s.posts.map((p) => (p.id === post.id ? { ...p, viewCount: next } : p)),
        }))
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id])

  // Real-time synchronization: subscribe to live comment updates on this post
  useEffect(() => {
    if (!params.id) return
    const supabase = createSupabaseBrowserClient()
    const channel = supabase
      .channel(`realtime-comments-${params.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${params.id}`,
        },
        (payload) => {
          const newRow = payload.new as unknown as CommentRow
          const mapped = rowToComment(newRow)
          usePostStore.setState((s) => {
            if (s.comments.some((c) => c.id === mapped.id)) return s
            return {
              comments: [...s.comments, mapped],
              posts: s.posts.map((p) =>
                p.id === params.id ? { ...p, commentCount: p.commentCount + 1 } : p,
              ),
            }
          })
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${params.id}`,
        },
        (payload) => {
          const oldRow = payload.old as { id: string }
          usePostStore.setState((s) => ({
            comments: s.comments.filter((c) => c.id !== oldRow.id),
            posts: s.posts.map((p) =>
              p.id === params.id ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p,
            ),
          }))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [params.id])

  if (lookingUp) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  }

  if (notFound && !post) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={SearchX}
          title={s["postDetail.notFound.title"]}
          description={s["postDetail.notFound.description"]}
          action={
            <Link href="/feed">
              <Button variant="outline">
                <ArrowLeft size={16} aria-hidden /> {s["postDetail.notFound.backToFeed"]}
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  if (!post) return null

  const isFollower = follows.some(
    (f) => f.followerId === currentUser?.id && f.followingId === post.authorId,
  )
  const canViewPost =
    !post.isFollowersOnly ||
    post.authorId === currentUser?.id ||
    currentUser?.isAdmin ||
    isFollower

  if (!canViewPost) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={SearchX}
          title="Followers Only Post"
          description="This post is private and can only be viewed by accepted followers of the author."
          action={
            <Link href="/feed">
              <Button variant="outline">
                <ArrowLeft size={16} aria-hidden /> {s["postDetail.notFound.backToFeed"]}
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-primary-700 hover:underline"
      >
        <ArrowLeft size={16} aria-hidden /> {s["postDetail.backToFeed"]}
      </Link>

      <PostCard post={post} showFollow={false} />

      <section className="mt-6" aria-label="Comments">
        <h2 className="mb-3 text-h4">{s["postDetail.commentsHeading"](post.commentCount)}</h2>
        {/* Fixed composer on mobile above bottom nav; inline on desktop */}
        <div className="sticky bottom-24 z-10 mb-4 lg:static lg:mb-4 lg:bottom-auto">
          <div className="rounded-card border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <CommentInput postId={post.id} />
          </div>
        </div>
        <CommentThread postId={post.id} />
      </section>
    </div>
  )
}