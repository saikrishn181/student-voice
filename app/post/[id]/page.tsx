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
import s from "@/lib/strings"

export default function PostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const post = usePostStore((s) => s.posts.find((p) => p.id === params.id))
  const posts = usePostStore((s) => s.posts)
  const [lookingUp, setLookingUp] = useState(posts.length === 0)
  const [notFound, setNotFound] = useState(posts.length > 0 && !post)
  const currentUser = useAuthStore((s) => s.currentUser)

  // Store memory doesn't survive a refresh — if we have nothing cached, fetch
  // the post + comments directly instead of flashing "not found".
  useEffect(() => {
    if (post) {
      setLookingUp(false)
      setNotFound(false)
      return
    }
    if (posts.length > 0) {
      setNotFound(true)
      setLookingUp(false)
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
      const { data: commentRows } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", params.id)
        .order("created_at", { ascending: true })
      usePostStore.setState((s) => ({
        posts: s.posts.some((p) => p.id === row.id) ? s.posts : [row as any, ...s.posts],
        comments: [
          ...s.comments.filter((c) => c.postId !== params.id),
          ...(commentRows ?? []).map((r) => ({
            id: r.id,
            postId: r.post_id,
            authorId: r.author_id,
            text: r.content,
            isOrgHelp: r.is_org_help,
            createdAt: r.created_at,
          })),
        ],
      }))
      setLookingUp(false)
      setNotFound(false)
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, post, posts.length])

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
        <div className="sticky bottom-20 z-10 mb-4 lg:static lg:mb-4 lg:bottom-auto">
          <div className="rounded-card border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
            <CommentInput postId={post.id} />
          </div>
        </div>
        <CommentThread postId={post.id} />
      </section>
    </div>
  )
}