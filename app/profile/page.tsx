"use client"

// Profile page: shows the current user's profile with their info, stats, and
// recent posts. Account management (edit profile, follow requests, blocked
// users, login method, log out) lives on the /settings page.
import { useEffect, useState } from "react"
import { User, Inbox, Settings, Lock } from "lucide-react"
import Link from "next/link"
import { Card, Avatar, EmptyState, Skeleton } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { PostCard, FollowersModal } from "@/components/feature"
import { Button } from "@/components/ui/Button"
import s from "@/lib/strings"
import type { FollowsTab } from "@/components/feature/FollowersModal"

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const posts = usePostStore((s) => s.posts)
  const [loading, setLoading] = useState(true)
  const [followsTab, setFollowsTab] = useState<FollowsTab | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400)
    return () => window.clearTimeout(timer)
  }, [])

  const myPosts = posts.filter((p) => p.authorId === currentUser?.id)

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={User}
          title={s["profile.empty.title"]}
          description={s["profile.empty.description"]}
          action={
            <Link href="/signup">
              <Button>{s["profile.empty.signup"]}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        {/* Profile header card */}
        <Card className="relative flex flex-col items-center gap-4 text-center">
          {/* Settings — top-right */}
          <Link
            href="/settings"
            aria-label={s["settings.pageTitle"]}
            className="absolute right-4 top-4"
          >
            <Button variant="outline" size="sm">
              <Settings size={16} />
              <span className="hidden sm:inline">{s["settings.pageTitle"]}</span>
            </Button>
          </Link>
          <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="lg" />
          <div>
            <h1 className="text-h3 text-slate-900">{currentUser.name}</h1>
            {currentUser.username ? (
              <p className="text-body-sm text-slate-500">@{currentUser.username}</p>
            ) : null}
            <p className="text-body-sm text-slate-500">
              {currentUser.accountType === "organization" ? s["post.authorType.org"] : s["post.authorType.student"]}
              {currentUser.state ? ` · ${currentUser.state}` : ""}
            </p>
            {currentUser.isPrivate ? (
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-400">
                <Lock size={12} aria-hidden /> {s["profile.private.badge"]}
              </p>
            ) : null}
          </div>
          {currentUser.bio ? (
            <p className="max-w-md text-body-sm text-slate-600">{currentUser.bio}</p>
          ) : null}
          <div className="flex gap-6 text-center">
            <button
              type="button"
              onClick={() => setFollowsTab("followers")}
              className="rounded-card p-1 transition-colors hover:bg-slate-50"
              aria-label={s["follow.modal.followers"]}
            >
              <p className="text-h4 text-slate-900">{currentUser.followerCount}</p>
              <p className="text-xs text-slate-500">{s["profile.followers"]}</p>
            </button>
            <button
              type="button"
              onClick={() => setFollowsTab("following")}
              className="rounded-card p-1 transition-colors hover:bg-slate-50"
              aria-label={s["follow.modal.following"]}
            >
              <p className="text-h4 text-slate-900">{currentUser.followingCount}</p>
              <p className="text-xs text-slate-500">{s["profile.following"]}</p>
            </button>
          </div>
        </Card>

        {/* User's posts */}
        <div>
          <h2 className="mb-3 text-h4">{s["profile.yourPosts"]}</h2>
          {myPosts.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={s["profile.noPosts.title"]}
              description={s["profile.noPosts.description"]}
              action={
                <Link href="/post/create">
                  <Button>{s["profile.createPost"]}</Button>
                </Link>
              }
            />
          ) : (
            <div className="flex flex-col gap-4">
              {myPosts.map((post) => (
                <PostCard key={post.id} post={post} showFollow={false} />
              ))}
            </div>
          )}
        </div>
      </div>

      <FollowersModal
        open={followsTab !== null}
        onClose={() => setFollowsTab(null)}
        userId={currentUser.id}
        initialTab={followsTab ?? "followers"}
      />
    </div>
  )
}
