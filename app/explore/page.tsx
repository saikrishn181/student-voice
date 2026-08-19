"use client"

// Explore: server-backed discovery.
//  - Trending hashtags: top posts (by engagement) from the last 30 days are
//    aggregated client-side into tag frequencies + support totals.
//  - Trending regions: most active states in the same window.
//  - Recommended organizations: verified first, then follower count.
// Each trending topic can be followed from here; followed topics filter the
// feed's "Following" tab.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Compass, Hash, MapPin, Building2 } from "lucide-react"
import { Card, Avatar, EmptyState, Spinner } from "@/components/ui"
import { FollowButton } from "@/components/feature/FollowButton"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

interface Topic {
  tag: string
  posts: number
  supports: number
}

interface Region {
  state: string
  posts: number
  supports: number
}

interface PostRow {
  id: string
  author_id: string
  hashtags: string[] | null
  state: string | null
  support_count: number
  created_at: string
}

interface OrgRow {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  state: string | null
  follower_count: number
  verification_status: string | null
}

export default function ExplorePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const follows = usePostStore((s) => s.follows)
  const followedTopics = usePostStore((s) => s.followedTopics)
  const toggleFollowTopic = usePostStore((s) => s.toggleFollowTopic)
  const loadFollowedTopics = usePostStore((s) => s.loadFollowedTopics)
  const showToast = useToastStore((s) => s.show)
  const users = useUserStore((s) => s.users)

  const [topics, setTopics] = useState<Topic[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    if (currentUser) void loadFollowedTopics(currentUser.id)
  }, [currentUser, loadFollowedTopics])

  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    ;(async () => {
      const [postRes, orgRes] = await Promise.all([
        supabase
          .from("posts")
          .select("id, author_id, hashtags, state, support_count, created_at")
          .or("scheduled_for.is.null,scheduled_for.lte.now")
          .gte("created_at", since)
          .order("support_count", { ascending: false })
          .limit(60),
        supabase
          .from("profiles")
          .select("id, name, avatar_url, bio, state, follower_count, verification_status")
          .eq("account_type", "organization")
          .order("follower_count", { ascending: false })
          .limit(12),
      ])
      if (cancelled) return
      if (postRes.error || orgRes.error) {
        setStatus("error")
        return
      }

      const tagMap = new Map<string, Topic>()
      const regionMap = new Map<string, Region>()
      for (const row of (postRes.data ?? []) as PostRow[]) {
        for (const tag of row.hashtags ?? []) {
          const cur = tagMap.get(tag) ?? { tag, posts: 0, supports: 0 }
          cur.posts += 1
          cur.supports += row.support_count
          tagMap.set(tag, cur)
        }
        if (row.state) {
          const cur = regionMap.get(row.state) ?? { state: row.state, posts: 0, supports: 0 }
          cur.posts += 1
          cur.supports += row.support_count
          regionMap.set(row.state, cur)
        }
      }
      setTopics(
        [...tagMap.values()]
          .sort((a, b) => b.supports - a.supports || b.posts - a.posts)
          .slice(0, 15),
      )
      setRegions(
        [...regionMap.values()]
          .sort((a, b) => b.supports - a.supports || b.posts - a.posts)
          .slice(0, 10),
      )
      setOrgs((orgRes.data ?? []) as OrgRow[])
      setStatus("ready")
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const followedIds = useMemo(
    () => new Set(follows.filter((f) => f.followerId === currentUser?.id).map((f) => f.followingId)),
    [follows, currentUser?.id],
  )

  const handleToggleTopic = async (tag: string) => {
    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }
    try {
      await toggleFollowTopic(tag, currentUser.id)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    }
  }

  const followCount = (org: OrgRow) =>
    org.verification_status === "verified" ? 1 : 0

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="flex items-center gap-2 text-h2 text-slate-900">
            <Compass className="size-6 text-primary-600" aria-hidden /> {s["explore.title"]}
          </h1>
          <p className="text-body-sm text-slate-500">{s["explore.subtitle"]}</p>
        </div>

        {status === "loading" ? (
          <div className="flex justify-center py-10">
            <Spinner size={28} />
          </div>
        ) : null}

        {status === "error" ? (
          <Card className="p-6">
            <EmptyState
              icon={Compass}
              title={s["feed.error.title"]}
              description={s["feed.error.description"]}
            />
          </Card>
        ) : null}

        {status === "ready" ? (
          <>
            {/* Trending hashtags */}
            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-h4">
                <Hash className="size-5 text-accent-500" aria-hidden /> {s["explore.trendingTags"]}
              </h2>
              {topics.length === 0 ? (
                <p className="mt-3 text-body-sm text-slate-500">{s["explore.noTags"]}</p>
              ) : (
                <div className="mt-3 flex flex-col divide-y divide-slate-100">
                  {topics.map((topic, rank) => {
                    const following = followedTopics.includes(topic.tag)
                    return (
                      <div key={topic.tag} className="flex items-center gap-3 py-3">
                        <span className="w-6 text-sm font-bold text-slate-300">{rank + 1}</span>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/tag/${encodeURIComponent(topic.tag)}`}
                            className="truncate text-sm font-semibold text-primary-700 hover:underline"
                          >
                            #{topic.tag}
                          </Link>
                          <p className="text-xs text-slate-400">
                            {s["explore.topicMeta"](topic.posts, topic.supports)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleTopic(topic.tag)}
                          aria-pressed={following}
                          className={cn(
                            "shrink-0 rounded-pill px-3 py-1 text-xs font-semibold transition-app",
                            following
                              ? "bg-primary-600 text-white"
                              : "border border-primary-200 bg-white text-primary-700 hover:bg-primary-50",
                          )}
                        >
                          {following ? s["explore.following"] : s["explore.follow"]}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Trending regions */}
            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-h4">
                <MapPin className="size-5 text-accent-500" aria-hidden /> {s["explore.trendingRegions"]}
              </h2>
              {regions.length === 0 ? (
                <p className="mt-3 text-body-sm text-slate-500">{s["explore.noRegions"]}</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {regions.map((region) => (
                    <Link
                      key={region.state}
                      href={`/search?q=${encodeURIComponent(region.state)}`}
                      className="flex items-center gap-2 rounded-card border border-slate-200 px-3 py-2.5 transition-app hover:border-primary-300 hover:bg-primary-50/50"
                    >
                      <MapPin size={14} className="shrink-0 text-slate-400" aria-hidden />
                      <span className="truncate text-sm font-medium text-slate-700">
                        {region.state}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-slate-400">
                        {region.posts}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Recommended orgs */}
            <Card className="p-4">
              <h2 className="flex items-center gap-2 text-h4">
                <Building2 className="size-5 text-primary-600" aria-hidden />{" "}
                {s["explore.recommendedOrgs"]}
              </h2>
              <div className="mt-3 flex flex-col gap-3">
                {orgs
                  .filter((org) => org.id !== currentUser?.id && !followedIds.has(org.id))
                  .sort((a, b) => followCount(b) - followCount(a))
                  .slice(0, 8)
                  .map((org) => (
                    <div key={org.id} className="flex items-center gap-3">
                      <Avatar name={org.name} src={org.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/profile/${org.id}`}
                          className="block truncate text-sm font-semibold text-slate-800 hover:underline"
                        >
                          {org.name}
                        </Link>
                        <p className="flex items-center gap-1.5 text-xs text-slate-400">
                          {org.verification_status === "verified" ? (
                            <span className="text-primary-600">{s["explore.verified"]}</span>
                          ) : null}
                          {org.state ? org.state : s["explore.noState"]}
                        </p>
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
          </>
        ) : null}
      </div>
    </div>
  )
}