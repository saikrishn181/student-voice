"use client"

// Profile page: shows the current user's profile with their info, stats, and
// recent posts, plus a "Blocked users" management section (unblock). Skeleton
// while "loading," EmptyState if no profile.
import { useEffect, useState } from "react"
import { User, Inbox, Settings, ShieldBan, Lock, UserPlus, Check, X } from "lucide-react"
import Link from "next/link"
import { Card, Avatar, EmptyState, Skeleton } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserById } from "@/hooks"
import { PostCard, EditProfileModal, FollowersModal } from "@/components/feature"
import { Button } from "@/components/ui/Button"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import type { FollowsTab } from "@/components/feature/FollowersModal"

// One incoming follow request row: shows who wants to follow you, with
// Accept / Reject actions. Accepting creates the follow via the DB trigger.
function FollowRequestCard({ requestId, userId }: { requestId: string; userId: string }) {
  const user = useUserById(userId)
  const respondToFollowRequest = usePostStore((s) => s.respondToFollowRequest)
  const showToast = useToastStore((s) => s.show)
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null)

  const handle = async (accept: boolean) => {
    if (busy) return
    setBusy(accept ? "accept" : "reject")
    try {
      await respondToFollowRequest(requestId, accept)
      showToast(accept ? s["follow.requestAccepted"] : s["follow.requestRejected"], "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <Link href={`/profile/${userId}`} className="flex min-w-0 items-center gap-3">
        <Avatar name={user?.name ?? "?"} src={user?.avatarUrl ?? null} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-slate-900">{user?.name ?? "…"}</p>
          <p className="text-xs text-slate-500">{user?.username ? `@${user.username}` : ""}</p>
        </div>
      </Link>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="primary"
          size="sm"
          loading={busy === "accept"}
          disabled={busy === "reject"}
          onClick={() => void handle(true)}
          aria-label={s["follow.accept"]}
        >
          <Check size={16} aria-hidden />
          {s["follow.accept"]}
        </Button>
        <Button
          variant="outline"
          size="sm"
          loading={busy === "reject"}
          disabled={busy === "accept"}
          onClick={() => void handle(false)}
          aria-label={s["follow.reject"]}
        >
          <X size={16} aria-hidden />
          {s["follow.reject"]}
        </Button>
      </div>
    </li>
  )
}

// One blocked user row. A separate component so useUserById keeps the hook
// order stable even though the list length is dynamic.
function BlockedUserCard({ userId, onUnblock }: { userId: string; onUnblock: (id: string) => void }) {
  const user = useUserById(userId)
  const [unblocking, setUnblocking] = useState(false)
  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={user?.name ?? "?"} src={user?.avatarUrl ?? null} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-slate-900">{user?.name ?? "…"}</p>
          <p className="text-xs text-slate-500">{user?.username ? `@${user.username}` : ""}</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        loading={unblocking}
        onClick={async () => {
          setUnblocking(true)
          try {
            await onUnblock(userId)
          } finally {
            setUnblocking(false)
          }
        }}
      >
        {s["block.unblock"]}
      </Button>
    </li>
  )
}

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const posts = usePostStore((s) => s.posts)
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const unblockUser = usePostStore((s) => s.unblockUser)
  const followRequests = usePostStore((s) => s.followRequests)
  const showToast = useToastStore((s) => s.show)
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [followsTab, setFollowsTab] = useState<FollowsTab | null>(null)

  // Incoming follow requests (sent TO me) for the accept/reject list.
  const myIncoming = followRequests.filter((r) => r.targetId === currentUser?.id)

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
          {/* Settings (edit profile) — top-right */}
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-4"
            onClick={() => setSettingsOpen(true)}
            aria-label={s["settings.title"]}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">{s["settings.title"]}</span>
          </Button>
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

        {/* Incoming follow requests */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <UserPlus size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["profile.followRequests.title"]}</h2>
          </div>
          {myIncoming.length === 0 ? (
            <Card className="py-6">
              <p className="text-center text-body-sm text-slate-500">
                {s["profile.followRequests.empty"]}
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-body-sm text-slate-500">
                {s["profile.followRequests.description"]}
              </p>
              <ul>
                {myIncoming.map((r) => (
                  <FollowRequestCard key={r.id} requestId={r.id} userId={r.requesterId} />
                ))}
              </ul>
            </Card>
          )}
        </div>

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

        {/* Blocked users */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ShieldBan size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["profile.blockedUsers.title"]}</h2>
          </div>
          {blockedUserIds.length === 0 ? (
            <Card className="py-6">
              <p className="text-center text-body-sm text-slate-500">
                {s["profile.blockedUsers.empty"]}
              </p>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-body-sm text-slate-500">
                {s["profile.blockedUsers.description"]}
              </p>
              <ul>
                {blockedUserIds.map((id) => (
                  <BlockedUserCard
                    key={id}
                    userId={id}
                    onUnblock={async (userId) => {
                      await unblockUser(userId)
                      showToast(s["block.userUnblocked"], "success")
                    }}
                  />
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <EditProfileModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <FollowersModal
        open={followsTab !== null}
        onClose={() => setFollowsTab(null)}
        userId={currentUser.id}
        initialTab={followsTab ?? "followers"}
      />
    </div>
  )
}