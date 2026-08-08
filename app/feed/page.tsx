"use client"

// Feed — Phase 2.
// Posts come from the Supabase-backed store (loaded once via loadAll), then
// infinite scroll reveals them 10 at a time with an Intersection Observer. An
// EmptyState shows when the feed is exhausted. Shows a subtle divider between
// the user's local posts and other regions. On desktop (>=1024px) a right
// sidebar lists trending posts and suggested organizations.
import { useEffect, useMemo, useRef, useState } from "react"
import { TrendingUp, Building2, Inbox, AlertTriangle, RefreshCw } from "lucide-react"
import { PostCard } from "@/components/feature"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { FollowButton } from "@/components/feature/FollowButton"
import { EmptyState, Spinner, Card, Avatar, Button } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { FEED_PAGE_SIZE } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

export default function FeedPage() {
  const { posts, status, loadErrorMessage, loadAll, loadMore, hasMore } = usePostStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const follows = usePostStore((s) => s.follows)
  const users = useUserStore((s) => s.users)

  const initialLoading = status === "idle" || status === "loading"
  const loadError = status === "error"
  const [retrying, setRetrying] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

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

  // Trending: top 3 by supportCount. Suggestions: orgs not yet followed.
  const trending = useMemo(
    () => [...posts].sort((a, b) => b.supportCount - a.supportCount).slice(0, 3),
    [posts],
  )

  const suggestedOrgs = Object.values(users).filter(
    (u) =>
      u.accountType === "organization" &&
      u.id !== currentUser?.id &&
      !follows.some((f) => f.followerId === currentUser?.id && f.followingId === u.id),
  ).slice(0, 3)

  const localState = currentUser?.state

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Main feed column */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-h2 text-slate-900">{s["feed.title"]}</h1>
          <p className="text-body-sm text-slate-500">
            {localState ? s["feed.subtitle.near"](localState) : s["feed.subtitle.default"]}
          </p>
        </div>

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

      {/* Desktop sidebar (>= 1024px) */}
      <aside className="hidden flex-col gap-6 lg:flex">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-h4">
            <TrendingUp className="size-5 text-accent-500" /> {s["feed.trending"]}
          </h2>
          <div className="mt-3 flex flex-col divide-y divide-slate-100">
            {trending.map((p) => {
              const author = users[p.authorId]
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <Avatar name={author?.name ?? "?"} src={author?.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.text}</p>
                    <p className="text-xs text-slate-400">{s["feed.supports"](p.supportCount)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-h4 font-bold">
            <Building2 className="size-5 text-primary-600" /> {s["feed.suggestedOrgs"]}
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {suggestedOrgs.map((org) => (
              <div key={org.id} className="flex items-center gap-3">
                <Avatar name={org.name} src={org.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{org.name}</p>
                  <p className="text-xs text-slate-400">{s["feed.followers"](org.followerCount)}</p>
                </div>
                <FollowButton
                  followerId={currentUser?.id ?? ""}
                  followingId={org.id}
                  className="shrink-0"
                />
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  )
}