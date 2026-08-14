"use client"

// Feed — Phase 2.
// Posts come from the Supabase-backed store (loaded once via loadAll), then
// infinite scroll reveals them 10 at a time with an Intersection Observer. An
// EmptyState shows when the feed is exhausted. Shows a subtle divider between
// the user's local posts and other regions. On desktop (>=1024px) a right
// sidebar lists trending posts and suggested organizations.
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Inbox, AlertTriangle, RefreshCw } from "lucide-react"
import { PostCard } from "@/components/feature"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { EmptyState, Spinner, Avatar, Button } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import s from "@/lib/strings"

export default function FeedPage() {
  const router = useRouter()
  const { posts, status, loadAll, loadMore, hasMore } = usePostStore()
  const currentUser = useAuthStore((s) => s.currentUser)

  const initialLoading = status === "idle" || status === "loading"
  const loadError = status === "error"
  const [retrying, setRetrying] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Load once on mount; keep ears open for live updates (default-on but
  // silently no-ops if Supabase Realtime isn't enabled for the project).
  useEffect(() => {
    loadAll(currentUser?.id)
    usePostStore.getState().startRealtime(currentUser?.id)
    return () => {
      usePostStore.getState().stopRealtime()
    }
  }, [loadAll, currentUser?.id])

  const handleRetry = () => {
    setRetrying(true)
    loadAll(currentUser?.id).finally(() => setRetrying(false))
  }

  const allLoaded = !hasMore

  // Load the next page from Supabase when the sentinel enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || allLoaded || initialLoading || loadError || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !allLoaded) {
          setLoadingMore(true)
          loadMore(currentUser?.id)
            .finally(() => setLoadingMore(false))
            .catch(() => setLoadingMore(false))
        }
      },
      { rootMargin: "300px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [allLoaded, loadingMore, posts.length, initialLoading, loadError, loadMore, currentUser?.id])

  const localState = currentUser?.state

  return (
    <div className="flex flex-col gap-5">
      {/* Inline Create Post Widget */}
      {currentUser && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-app hover:shadow-md">
          <div className="flex gap-4">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <input
                type="text"
                placeholder="What's happening on campus?"
                onClick={() => router.push('/post/create')}
                className="w-full cursor-text rounded-full border-none bg-slate-100 py-3 pl-4 pr-4 text-[16px] outline-none transition-app hover:bg-slate-200 focus:bg-white focus:ring-1 focus:ring-primary-500"
                readOnly
              />
            </div>
          </div>
        </div>
      )}

        {/* Loading skeleton */}
        {initialLoading && !loadError ? <PostCardSkeleton count={3} /> : null}

        {/* Error state */}
        {loadError ? (
          <div className="surface-card">
            <EmptyState
              icon={AlertTriangle}
              title={s["feed.error.title"]}
              description={s["feed.error.description"]}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={handleRetry}
                  loading={retrying}
                >
                  {s["feed.error.retry"]}
                </Button>
              }
            />
          </div>
        ) : null}

        {/* Posts */}
        {!initialLoading && !loadError
          ? posts.map((post) => {
              const isLocal = post.state === localState
              return (
                <div key={post.id} className="flex flex-col gap-1">
                  <PostCard post={post} />
                  {/* Subtle divider*/}
                  <div className="my-1 flex items-center gap-3 px-1 opacity-70">
                    <span className="h-px flex-1 bg-slate-200" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {isLocal ? s["feed.yourRegion"] : s["feed.otherRegions"]}
                    </span>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                </div>
              )
            })
          : null}

        {!initialLoading && !loadError && allLoaded && posts.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={s["feed.empty.title"]}
            description={s["feed.empty.description"]}
          />
        ) : null}

      {/* Sentinel for infinite scroll */}
      {!initialLoading && !loadError && !allLoaded ? (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore ? <Spinner size={28} /> : null}
        </div>
      ) : null}
    </div>
  )
}