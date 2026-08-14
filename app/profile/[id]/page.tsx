"use client"

// Public profile page for ANY user (/profile/[id]).
//
// - Public accounts: full profile — avatar, name, bio, stats, posts, Follow
//   button, and a "Message" button.
// - Private accounts: if you're NOT a follower (and not the owner), you only
//   see the avatar, name, bio, and counts. No posts, no message. You can send
//   a follow request; once accepted you see everything.
import { useEffect, useMemo, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Lock, MessageSquare, UserPlus, UserCheck, Clock, ShieldCheck } from "lucide-react"
import { Avatar, Button, Card, EmptyState, Skeleton } from "@/components/ui"
import { PostCard, VerifiedBadge, FollowButton, FollowersModal } from "@/components/feature"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { Post, User } from "@/lib/types"
import type { FollowsTab } from "@/components/feature/FollowersModal"

interface ProfileStats {
  posts_count: number
  follower_count: number
  following_count: number
}

export default function PublicProfilePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const targetUser = useUserById(params.id)
  const follows = usePostStore((s) => s.follows)
  const followRequests = usePostStore((s) => s.followRequests)
  const posts = usePostStore((s) => s.posts)
  const showToast = useToastStore((s) => s.show)

  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [followsTab, setFollowsTab] = useState<FollowsTab | null>(null)

  const isSelf = currentUser?.id === params.id
  const isFollowing = follows.some(
    (f) => f.followerId === currentUser?.id && f.followingId === params.id,
  )
  const myRequest = followRequests.find(
    (r) => r.requesterId === currentUser?.id && r.targetId === params.id && r.status === "pending",
  )
  const canViewContent = isSelf || isFollowing || !targetUser?.isPrivate || currentUser?.isAdmin

  // Direct link (deep link / refresh): store may be empty, so hydrate.
  useEffect(() => {
    if (currentUser?.id === params.id) {
      router.replace("/profile")
      return
    }
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    ;(async () => {
      const { data: row } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.id)
        .maybeSingle()
      if (cancelled) return
      if (!row) {
        setNotFound(true)
        setLoading(false)
        return
      }
      useUserStore.getState().loadById(params.id)
      const { data: statsData } = await supabase.rpc("get_profile_stats", {
        p_user: params.id,
      })
      if (!cancelled && statsData) setStats((statsData as ProfileStats[])[0] ?? null)
      // Hydrate posts for the feed store so PostCards render.
      if (usePostStore.getState().status !== "ready") {
        usePostStore.getState().loadAll(currentUser?.id)
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [params.id, currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const theirPosts = useMemo(
    () => posts.filter((p) => p.authorId === params.id),
    [posts, params.id],
  )

  const handleMessage = async () => {
    if (!currentUser) {
      router.push("/login")
      return
    }
    try {
      const convId = await useChatStore.getState().getOrCreateConversation(params.id)
      if (convId) router.push(`/messages/${convId}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["profile.cannotMessage"], "error")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (notFound || !targetUser) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={UserCheck}
          title={s["profile.notFound.title"]}
          description={s["profile.notFound.description"]}
          action={
            <Link href="/feed">
              <Button variant="outline">{s["profile.notFound.backToFeed"]}</Button>
            </Link>
          }
        />
      </div>
    )
  }

  const followerCount = stats?.follower_count ?? targetUser.followerCount
  const followingCount = stats?.following_count ?? targetUser.followingCount
  const postsCount = stats?.posts_count ?? theirPosts.length

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        {/* Profile header card */}
        <Card className="relative flex flex-col items-center gap-4 text-center">
          <Avatar name={targetUser.name} src={targetUser.avatarUrl ?? null} size="lg" />
          <div>
            <h1 className="flex items-center justify-center gap-1.5 text-h3 text-slate-900">
              {targetUser.name}
              {targetUser.accountType === "organization" &&
              targetUser.verificationStatus === "verified" ? (
                <VerifiedBadge />
              ) : null}
            </h1>
            {targetUser.username ? (
              <p className="text-body-sm text-slate-500">@{targetUser.username}</p>
            ) : null}
            <p className="mt-1 flex items-center justify-center gap-1.5 text-body-sm text-slate-500">
              {targetUser.isPrivate ? <Lock size={13} aria-hidden /> : null}
              {targetUser.accountType === "organization"
                ? s["post.authorType.org"]
                : s["post.authorType.student"]}
              {targetUser.state ? ` · ${targetUser.state}` : ""}
            </p>
          </div>

          {targetUser.bio ? (
            <p className="max-w-md text-body-sm text-slate-600">{targetUser.bio}</p>
          ) : null}

          {/* Stats — clickable for followers/owner only (private accounts keep
              their lists private too). */}
          <div className="flex gap-6 text-center">
            <button
              type="button"
              disabled={!canViewContent}
              onClick={() => setFollowsTab("followers")}
              className={cn(
                "rounded-card p-1 transition-colors",
                canViewContent ? "hover:bg-slate-50" : "cursor-default",
              )}
              aria-label={s["follow.modal.followers"]}
            >
              <p className="text-h4 text-slate-900">{followerCount}</p>
              <p className="text-xs text-slate-500">{s["profile.followers"]}</p>
            </button>
            <button
              type="button"
              disabled={!canViewContent}
              onClick={() => setFollowsTab("following")}
              className={cn(
                "rounded-card p-1 transition-colors",
                canViewContent ? "hover:bg-slate-50" : "cursor-default",
              )}
              aria-label={s["follow.modal.following"]}
            >
              <p className="text-h4 text-slate-900">{followingCount}</p>
              <p className="text-xs text-slate-500">{s["profile.following"]}</p>
            </button>
            <div>
              <p className="text-h4 text-slate-900">{postsCount}</p>
              <p className="text-xs text-slate-500">{s["profile.stats.posts"]}</p>
            </div>
          </div>

          {/* Actions */}
          {!isSelf ? (
            <div className="flex items-center gap-2">
              <FollowButton followerId={currentUser?.id ?? ""} followingId={targetUser.id} />
              {canViewContent ? (
                <Button size="sm" variant="outline" onClick={handleMessage}>
                  <MessageSquare size={16} aria-hidden /> {s["post.message"]}
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Private-account gate */}
        {!canViewContent ? (
          <Card className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Lock size={22} aria-hidden />
            </span>
            <p className="text-body-sm text-slate-600">{s["profile.private.description"]}</p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              {myRequest ? (
                <>
                  <Clock size={13} aria-hidden /> {s["profile.private.requestPending"]}
                </>
              ) : (
                <>
                  <UserPlus size={13} aria-hidden /> {s["profile.private.requestHint"]}
                </>
              )}
            </p>
          </Card>
        ) : (
          <div>
            <h2 className="mb-3 text-h4">{s["profile.yourPosts"]}</h2>
            {theirPosts.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title={s["profile.noPosts.title"]}
                description={s["profile.noPosts.description"]}
              />
            ) : (
              <div className="flex flex-col gap-4">
                {theirPosts.map((post) => (
                  <PostCard key={post.id} post={post} showFollow={false} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <FollowersModal
        open={followsTab !== null}
        onClose={() => setFollowsTab(null)}
        userId={targetUser.id}
        initialTab={followsTab ?? "followers"}
      />
    </div>
  )
}