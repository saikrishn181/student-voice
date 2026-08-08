"use client"

// Post detail page: full PostCard at top, CommentInput + CommentThread below.
// Looks up the post from the shared store; shows an EmptyState if not found.
import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { use } from "react"
import { PostCard } from "@/components/feature"
import { CommentInput } from "@/components/feature/CommentInput"
import { CommentThread } from "@/components/feature/CommentThread"
import { Button, EmptyState } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import s from "@/lib/strings"

export default function PostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const post = usePostStore((s) => s.posts.find((p) => p.id === params.id))

  if (!post) {
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