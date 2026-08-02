"use client"

// Post detail page: full PostCard at top, CommentInput + CommentThread below.
// If the post id isn't in mock data, shows an EmptyState with a back button.
// Uses static generation for the route; store lookup happens client-side.
import Link from "next/link"
import { ArrowLeft, SearchX } from "lucide-react"
import { use } from "react"
import { PostCard } from "@/components/feature"
import { CommentInput } from "@/components/feature/CommentInput"
import { CommentThread } from "@/components/feature/CommentThread"
import { Button, EmptyState } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"

export default function PostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const post = usePostStore((s) => s.posts.find((p) => p.id === params.id))

  if (!post) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <EmptyState
          icon={SearchX}
          title="Post not found"
          description="This post may have been removed, or the link is incorrect."
          action={
            <Link href="/feed">
              <Button variant="outline">
                <ArrowLeft /> Back to Feed
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-primary-700 hover:underline"
      >
        <ArrowLeft size={16} /> Back to feed
      </Link>

      <PostCard post={post} showFollow={false} />

      <section className="mt-6" aria-label="Comments">
        <h2 className="mb-3 text-h4">Comments ({post.commentCount})</h2>
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