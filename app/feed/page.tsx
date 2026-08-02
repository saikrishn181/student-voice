"use client"

// Feed — Phase 2.
// Infinite scroll via Intersection Observer: shows 10 posts at a time, a
// Spinner while fetching the next batch (simulated setTimeout), and an
// EmptyState once the mock data is exhausted. Shows a subtle divider between
// the user's local posts and other regions. On desktop (>=1024px) a right
// sidebar lists trending posts and suggested organizations.
import { useEffect, useMemo, useRef, useState } from "react"
import { TrendingUp, Building2, Inbox } from "lucide-react"
import { PostCard } from "@/components/feature"
import { FollowButton } from "@/components/feature/FollowButton"
import { EmptyState, Spinner, Card, Avatar } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { MOCK_USERS } from "@/lib/mockData"
import { FEED_PAGE_SIZE } from "@/constants"
import { cn } from "@/lib/utils"

export default function FeedPage() {
  const posts = usePostStore((s) => s.posts)
  const currentUser = useAuthStore((s) => s.currentUser)
  const follows = usePostStore((s) => s.follows)

  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const allLoaded = visibleCount >= posts.length

  // Load the next batch when the sentinel enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || allLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && !allLoaded) {
          setLoadingMore(true)
          // Simulate network latency for the next page.
          // TODO: real Supabase query with range()/limit() here.
          window.setTimeout(() => {
            setVisibleCount((c) => Math.min(c + FEED_PAGE_SIZE, posts.length))
            setLoadingMore(false)
          }, 700)
        }
      },
      { rootMargin: "300px" },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [allLoaded, loadingMore, posts.length])

  // Reset pagination if the underlying data set changes (new posts added).
  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE)
  }, [posts.length])

  const visiblePosts = posts.slice(0, visibleCount)

  // Trending: top 3 by supportCount. Suggestions: orgs not yet followed.
  const trending = useMemo(
    () => [...posts].sort((a, b) => b.supportCount - a.supportCount).slice(0, 3),
    [posts],
  )

  const suggestedOrgs = MOCK_USERS.filter(
    (u) =>
      u.accountType === "organization" &&
      u.id !== currentUser?.id &&
      !follows.some((f) => f.followerId === currentUser?.id && f.followingId === u.id),
  ).slice(0, 3)

  const localDistrict = currentUser?.district

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      {/* Main feed column */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-h2 text-slate-900">Feed</h1>
          <p className="text-body-sm text-slate-500">
            {localDistrict ? `Problems near ${localDistrict} and across India` : "Latest problems"}
          </p>
        </div>

        {visiblePosts.map((post) => {
          const isLocal = post.district === localDistrict
          return (
            <div key={post.id} className="flex flex-col gap-1">
              <PostCard post={post} />
              {/* Subtle divider*/}
              <div className="my-1 flex items-center gap-3 px-1 opacity-70">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  {isLocal ? "Your region" : "Other regions"}
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>
          )
        })}

        {allLoaded ? (
          <EmptyState
            icon={Inbox}
            title="You've seen everything for now"
            description="Come back soon — new problems from your region will show up here."
          />
        ) : null}

        {/* Sentinel for infinite scroll */}
        <div ref={sentinelRef} className="flex justify-center py-6">
          {loadingMore ? <Spinner size={28} /> : null}
        </div>
      </div>

      {/* Desktop sidebar (>= 1024px) */}
      <aside className="hidden flex-col gap-6 lg:flex">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-h4">
            <TrendingUp className="size-5 text-accent-500" /> Trending
          </h2>
          <div className="mt-3 flex flex-col divide-y divide-slate-100">
            {trending.map((p) => {
              const author = MOCK_USERS.find((u) => u.id === p.authorId)
              return (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <Avatar name={author?.name ?? "?"} src={author?.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{p.text}</p>
                    <p className="text-xs text-slate-400">{p.supportCount} supports</p>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="flex items-center gap-2 text-h4 font-bold">
            <Building2 className="size-5 text-primary-600" /> Suggested organizations
          </h2>
          <div className="mt-3 flex flex-col gap-3">
            {suggestedOrgs.map((org) => (
              <div key={org.id} className="flex items-center gap-3">
                <Avatar name={org.name} src={org.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{org.name}</p>
                  <p className="text-xs text-slate-400">{org.followerCount} followers</p>
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