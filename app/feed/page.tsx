"use client"

// Feed — Phase 2.
// Posts come from the Supabase-backed store (loaded once via loadAll), then
// infinite scroll reveals them 10 at a time with an Intersection Observer. An
// EmptyState shows when the feed is exhausted. Shows a subtle divider between
// the user's local posts and other regions. On desktop (>=1024px) a right
// sidebar lists trending posts and suggested organizations.
import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { TrendingUp, Building2, Inbox, AlertTriangle, RefreshCw, Sparkles, Plus } from "lucide-react"
import { PostCard } from "@/components/feature"
import { HotIssueBanner } from "@/components/feature/HotIssueBanner"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { FollowButton } from "@/components/feature/FollowButton"
import { FollowerSuggestions } from "@/components/feature/FollowerSuggestions"
import { EmptyState, Spinner, Card, Avatar, Button } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { rankPostsForYou } from "@/lib/recommendation"
import { detectHotIssues } from "@/lib/heatmap"
import { cn, getPostVibe } from "@/lib/utils"
import type { PostVibe } from "@/lib/types"
import s from "@/lib/strings"

export default function FeedPage() {
  const { posts, status, loadErrorMessage, loadAll, loadMore, hasMore, followedTopics } = usePostStore()
  const currentUser = useAuthStore((s) => s.currentUser)
  const follows = usePostStore((s) => s.follows)
  const users = useUserStore((s) => s.users)

  const initialLoading = status === "idle" || status === "loading"
  const loadError = status === "error"
  const [retrying, setRetrying] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartRef = useRef(0)
  const [filter, setFilter] = useState<"forYou" | "all" | "local" | "trending" | "topics">("forYou")
  const [vibeFilter, setVibeFilter] = useState<"all" | PostVibe>("all")
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Load once on mount; keep ears open for live updates (default-on but
  // silently no-ops if Supabase Realtime isn't enabled for the project).
  // NOTE: AppShell already calls loadAll on login; we only need to start realtime here.
  useEffect(() => {
    usePostStore.getState().startRealtime(currentUser?.id)
    return () => {
      usePostStore.getState().stopRealtime()
    }
  }, [currentUser?.id])

  const handleManualRefresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    usePostStore.getState().setIsRefreshing(true)
    try {
      await Promise.all([
        loadAll(currentUser?.id),
        new Promise((resolve) => setTimeout(resolve, 850)),
      ])
    } finally {
      setIsRefreshing(false)
      usePostStore.getState().setIsRefreshing(false)
      setPullDistance(0)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 5) {
      touchStartRef.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current > 0 && window.scrollY <= 5) {
      const distance = e.touches[0].clientY - touchStartRef.current
      if (distance > 0) {
        setPullDistance(Math.min(distance * 0.4, 60))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 35) {
      void handleManualRefresh()
    } else {
      setPullDistance(0)
    }
    touchStartRef.current = 0
  }

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

  // Campus Heatmap: detect surging issues across colleges.
  const hotIssues = useMemo(
    () => detectHotIssues(posts, users),
    [posts, users],
  )

  const localState = currentUser?.state

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]"
    >
      {/* Main feed column */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="sr-only">{s["feed.title"]}</h1>
          <p className="text-body-sm text-slate-500">
            {localState ? s["feed.subtitle.near"](localState) : s["feed.subtitle.default"]}
          </p>
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={isRefreshing}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-primary-700 active:scale-95 transition-all"
            title="Refresh Feed"
          >
            <RefreshCw size={16} className={cn(isRefreshing && "animate-spin text-primary-600")} />
          </button>
        </div>

        {/* Create Post Prompt Card with Multi-Intent Campus Vibe Shortcuts */}
        {currentUser && !initialLoading ? (
          <Card className="flex flex-col gap-2.5 p-3.5 border-[#E8E1D6] bg-white shadow-xs hover:border-primary-300 transition-all">
            <div className="flex items-center gap-3">
              <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
              <Link
                href="/post/create"
                className="flex-1 rounded-pill border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors truncate"
              >
                What&apos;s happening on campus? Issues, fests, notes, memories...
              </Link>
              <Link
                href="/post/create"
                className="flex items-center gap-1.5 rounded-pill bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-primary-700 active:scale-95 transition-all shrink-0"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Post</span>
              </Link>
            </div>

            {/* Quick-vibe intent buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Quick Post:</span>
              <Link
                href="/post/create?vibe=issue"
                className="inline-flex items-center rounded-pill border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Campus Issue
              </Link>
              <Link
                href="/post/create?vibe=life"
                className="inline-flex items-center rounded-pill border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Campus Life
              </Link>
              <Link
                href="/post/create?vibe=study"
                className="inline-flex items-center rounded-pill border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Study Hub
              </Link>
              <Link
                href="/post/create?vibe=other"
                className="inline-flex items-center rounded-pill border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
              >
                Other
              </Link>
            </div>
          </Card>
        ) : null}

        {/* Hot Issues Banner — Campus Heatmap */}
        {!initialLoading && hotIssues.length > 0 ? (
          <HotIssueBanner issues={hotIssues} />
        ) : null}

        {/* Feed filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["forYou", s["feed.filter.forYou"]],
              ["all", s["feed.filter.all"]],
              ["local", s["feed.filter.local"]],
              ["trending", s["feed.filter.trending"]],
              ["topics", s["feed.filter.topics"]],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-pill px-4 min-h-[44px] text-sm font-semibold transition-app flex items-center gap-1.5",
                filter === key
                  ? "bg-primary-700 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Campus Vibe Sub-filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
            Campus Pulse:
          </span>
          {[
            { id: "all", label: "All Campus" },
            { id: "issue", label: "Campus Issue" },
            { id: "life", label: "Campus Life" },
            { id: "study", label: "Study Hub" },
            { id: "other", label: "Other" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setVibeFilter(item.id as "all" | PostVibe)}
              className={cn(
                "rounded-pill px-3 py-1 font-semibold transition-all shrink-0 border",
                vibeFilter === item.id
                  ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile follower suggestions (horizontal scroll, hidden on desktop) */}
        {!initialLoading && !loadError ? (
          <FollowerSuggestions layout="horizontal" />
        ) : null}

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

        {/* Posts rendering */}
        {!initialLoading && !loadError
          ? (() => {
              if (filter === "forYou") {
                const ranked = rankPostsForYou(posts, users, currentUser, followedTopics)
                const filteredRanked = vibeFilter === "all" ? ranked : ranked.filter((p) => getPostVibe(p) === vibeFilter)
                if (filteredRanked.length === 0 && posts.length > 0) {
                  return (
                    <EmptyState
                      icon={
                        vibeFilter === "life"
                          ? PartyPopper
                          : vibeFilter === "study"
                            ? BookOpen
                            : vibeFilter === "other"
                              ? MessageSquare
                              : Megaphone
                      }
                      title={
                        vibeFilter === "life"
                          ? "No Campus Life posts yet"
                          : vibeFilter === "study"
                            ? "No Study Hub notes yet"
                            : vibeFilter === "other"
                              ? "No Other discussions yet"
                              : "No Campus Issues right now"
                      }
                      description={
                        vibeFilter === "life"
                          ? "Be the first to share a college fest update, party memory, hostel banter, or campus moment!"
                          : vibeFilter === "study"
                            ? "Share handwritten lecture notes, previous year question papers, or exam strategy with batchmates."
                            : vibeFilter === "other"
                              ? "Start a campus discussion, ask a question, or share thoughts with fellow students."
                              : "No active campus grievances in your feed right now."
                      }
                      action={
                        <Link href={`/post/create?vibe=${vibeFilter}`}>
                          <Button variant="outline" size="sm">
                            {vibeFilter === "life"
                              ? "Post Campus Life"
                              : vibeFilter === "study"
                                ? "Share Notes / Tips"
                                : vibeFilter === "other"
                                  ? "Start Discussion"
                                  : "Report Issue"}
                          </Button>
                        </Link>
                      }
                    />
                  )
                }
                return (
                  <>
                    {filteredRanked.map((post) => (
                      <div key={post.id}>
                        <PostCard post={post} recommendationReason={post.recommendationReason} />
                      </div>
                    ))}
                  </>
                )
              }

              let visible =
                filter === "trending"
                  ? [...posts].sort((a, b) => b.supportCount - a.supportCount)
                  : filter === "topics"
                    ? posts.filter((p) => p.hashtags.some((t) => followedTopics.includes(t.toLowerCase())))
                    : posts

              if (vibeFilter !== "all") {
                visible = visible.filter((p) => getPostVibe(p) === vibeFilter)
              }

              if (visible.length === 0 && posts.length > 0) {
                return (
                  <EmptyState
                    icon={
                      vibeFilter === "life"
                        ? PartyPopper
                        : vibeFilter === "study"
                          ? BookOpen
                          : vibeFilter === "other"
                            ? MessageSquare
                            : Megaphone
                    }
                    title={
                      vibeFilter === "life"
                        ? "No Campus Life posts yet"
                        : vibeFilter === "study"
                          ? "No Study Hub notes yet"
                          : vibeFilter === "other"
                            ? "No Other discussions yet"
                            : "No Campus Issues right now"
                    }
                    description={
                      vibeFilter === "life"
                        ? "Be the first to share a college fest update, party memory, hostel banter, or campus moment!"
                        : vibeFilter === "study"
                          ? "Share handwritten lecture notes, previous year question papers, or exam strategy with batchmates."
                          : vibeFilter === "other"
                            ? "Start a campus discussion, ask a question, or share thoughts with fellow students."
                            : "No active campus grievances found for this selection."
                    }
                    action={
                      <Link href={`/post/create?vibe=${vibeFilter}`}>
                        <Button variant="outline" size="sm">
                          {vibeFilter === "life"
                            ? "Post Campus Life"
                            : vibeFilter === "study"
                              ? "Share Notes / Tips"
                              : vibeFilter === "other"
                                ? "Start Discussion"
                                : "Report Issue"}
                        </Button>
                      </Link>
                    }
                  />
                )
              }

              const localPosts = filter === "all" && localState
                ? visible.filter((p) => p.state === localState)
                : []
              const otherPosts =
                filter === "local"
                  ? visible.filter((p) => p.state === localState)
                  : filter === "all"
                    ? localState
                      ? visible.filter((p) => p.state !== localState)
                      : visible
                    : visible
              const hasBoth = localPosts.length > 0 && otherPosts.length > 0
              return (
                <>
                  {localPosts.map((post) => (
                    <div key={post.id}>
                      <PostCard post={post} />
                    </div>
                  ))}
                  {hasBoth && (
                    <div className="my-1 flex items-center gap-3 px-1 opacity-70">
                      <span className="h-px flex-1 bg-slate-200" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                        {s["feed.otherRegions"]}
                      </span>
                      <span className="h-px flex-1 bg-slate-200" />
                    </div>
                  )}
                  {otherPosts.map((post) => (
                    <div key={post.id}>
                      <PostCard post={post} />
                    </div>
                  ))}
                </>
              )
            })()
          : null}

        {!initialLoading && !loadError && allLoaded && posts.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={s["feed.empty.title"]}
            description={s["feed.empty.description"]}
          />
        ) : null}

        {/* Following-topics filter with nothing followed yet */}
        {!initialLoading && !loadError && filter === "topics" && followedTopics.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title={s["feed.topicsEmpty.title"]}
            description={s["feed.topicsEmpty.description"]}
            action={
              <Link href="/search">
                <Button variant="outline" size="sm">
                  {s["feed.topicsEmpty.explore"]}
                </Button>
              </Link>
            }
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
              const isFriendViewing =
                currentUser?.id === p.authorId ||
                follows.some((f) => f.followerId === currentUser?.id && f.followingId === p.authorId)
              const isAnon = Boolean(
                (p.isAnonymous || (author?.isPrivate && !p.isFollowersOnly)) &&
                  !(p.friendsAlso && isFriendViewing),
              )
              const isAnonForViewer = isAnon && !currentUser?.isAdmin
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  {isAnonForViewer ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shadow-xs select-none border border-purple-200">
                      A
                    </div>
                  ) : (
                    <Avatar name={author?.name ?? "?"} src={author?.avatarUrl} size="sm" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.text}</p>
                    <p className="text-xs text-slate-400">
                      {isAnon
                        ? currentUser?.isAdmin && author?.name
                          ? `Anonymous (by ${author.name}) · `
                          : "Anonymous Student · "
                        : author?.name
                        ? `${author.name} · `
                        : ""}
                      {s["feed.supports"](p.supportCount)}
                    </p>
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

        <FollowerSuggestions layout="vertical" />
      </aside>
    </div>
  )
}