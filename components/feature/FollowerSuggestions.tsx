"use client"

// Suggests people to follow based on shared state, college, or activity.
// Desktop: vertical list in sidebar. Mobile: horizontal scrollable row.
import Link from "next/link"
import { UserPlus, X } from "lucide-react"
import { useState, useMemo } from "react"
import { Avatar } from "@/components/ui/Avatar"
import { Card } from "@/components/ui/Card"
import { FollowButton } from "@/components/feature/FollowButton"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { usePostStore } from "@/lib/store/usePostStore"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"
import s from "@/lib/strings"

const MAX_SUGGESTIONS = 5

function scoreSuggestion(candidate: User, currentUser: User, postCounts: Record<string, number>): number {
  let score = 0

  // Same state = strong signal
  if (candidate.state && currentUser.state && candidate.state === currentUser.state) {
    score += 30
  }

  // Same college = very strong
  if (
    candidate.collegeName &&
    currentUser.collegeName &&
    candidate.collegeName.toLowerCase() === currentUser.collegeName.toLowerCase()
  ) {
    score += 50
  }

  // Active posters get a bump
  const posts = postCounts[candidate.id] ?? 0
  if (posts >= 5) score += 15
  else if (posts >= 2) score += 8
  else if (posts >= 1) score += 3

  // More followers = more relevant
  if (candidate.followerCount >= 10) score += 10
  else if (candidate.followerCount >= 3) score += 5

  // Verified orgs get a bump
  if (candidate.accountType === "organization" && candidate.verificationStatus === "verified") {
    score += 20
  }

  return score
}

export function FollowerSuggestions({ layout = "vertical" }: { layout?: "vertical" | "horizontal" }) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const users = useUserStore((s) => s.users)
  const follows = usePostStore((s) => s.follows)
  const posts = usePostStore((s) => s.posts)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (p.isAnonymous) continue
      counts[p.authorId] = (counts[p.authorId] ?? 0) + 1
    }
    return counts
  }, [posts])

  const suggestions = useMemo(() => {
    if (!currentUser) return []

    const followingIds = new Set(
      follows
        .filter((f) => f.followerId === currentUser.id)
        .map((f) => f.followingId),
    )

    const candidates = Object.values(users).filter(
      (u) =>
        u.id !== currentUser.id &&
        !followingIds.has(u.id) &&
        !dismissed.has(u.id) &&
        !u.isBanned,
    )

    return candidates
      .map((u) => ({ user: u, score: scoreSuggestion(u, currentUser, postCounts) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS)
      .map((s) => s.user)
  }, [currentUser, users, follows, postCounts, dismissed])

  if (!currentUser || suggestions.length === 0) return null

  const handleDismiss = (userId: string) => {
    setDismissed((prev) => new Set(prev).add(userId))
  }

  // --- Mobile: horizontal scroll ---
  if (layout === "horizontal") {
    return (
      <div className="lg:hidden">
        <h3 className="mb-2 px-1 text-sm font-semibold text-slate-700">
          {s["feed.suggestions.title"]}
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {suggestions.map((user) => (
            <div
              key={user.id}
              className="relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-xs"
            >
              <button
                type="button"
                onClick={() => handleDismiss(user.id)}
                className="absolute right-1.5 top-1.5 rounded-full p-0.5 text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                aria-label={`Dismiss ${user.name}`}
              >
                <X size={14} />
              </button>
              <Link href={`/profile/${user.id}`}>
                <Avatar name={user.name} src={user.avatarUrl} size="lg" />
              </Link>
              <Link
                href={`/profile/${user.id}`}
                className="w-full truncate text-center text-xs font-semibold text-slate-800 hover:underline"
              >
                {user.name}
              </Link>
              {user.collegeName ? (
                <p className="w-full truncate text-center text-[10px] text-slate-400">
                  {user.collegeName}
                </p>
              ) : user.state ? (
                <p className="w-full truncate text-center text-[10px] text-slate-400">
                  {user.state}
                </p>
              ) : null}
              <FollowButton
                followerId={currentUser.id}
                followingId={user.id}
                targetIsPrivate={user.isPrivate}
                className="mt-auto w-full text-xs"
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // --- Desktop: vertical card in sidebar ---
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-h4 font-bold">
        <UserPlus className="size-5 text-primary-600" /> {s["feed.suggestions.title"]}
      </h2>
      <div className="mt-3 flex flex-col gap-3">
        {suggestions.map((user) => (
          <div key={user.id} className="group flex items-center gap-3">
            <Link href={`/profile/${user.id}`}>
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${user.id}`}
                className="block truncate text-sm font-semibold text-slate-800 hover:underline"
              >
                {user.name}
              </Link>
              <p className="truncate text-xs text-slate-400">
                {user.collegeName
                  ? user.collegeName
                  : user.state
                    ? user.state
                    : s["feed.suggestions.active"]}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <FollowButton
                followerId={currentUser.id}
                followingId={user.id}
                targetIsPrivate={user.isPrivate}
                className="shrink-0"
              />
              <button
                type="button"
                onClick={() => handleDismiss(user.id)}
                className={cn(
                  "rounded-full p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500",
                  "opacity-0 transition-opacity group-hover:opacity-100",
                )}
                aria-label={`Dismiss ${user.name}`}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
