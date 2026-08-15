"use client"

// Settings page: account management hub. Sections: Edit profile (opens the
// EditProfileModal), Login method (shows provider, lets email-less accounts set
// a password), Follow requests (accept/reject), Blocked users (unblock), and
// Log out.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  KeyRound,
  UserPlus,
  ShieldBan,
  LogOut,
  Check,
  X,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { Card, Avatar, EmptyState, Skeleton, Button, Input, Modal } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserById } from "@/hooks"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { EditProfileModal } from "@/components/feature"
import s from "@/lib/strings"

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

// Small modal for creating/changing the account password.
function PasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setPassword = useAuthStore((s) => s.setPassword)
  const showToast = useToastStore((s) => s.show)
  const [password, setPasswordValue] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setPasswordValue("")
      setError("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 6) {
      setError(s["settings.loginMethod.passwordTooShort"])
      return
    }
    setSaving(true)
    const result = await setPassword(password)
    setSaving(false)
    if (!result.ok) {
      setError(
        result.error?.toLowerCase().includes("session") ||
          result.error?.toLowerCase().includes("recent login")
          ? s["settings.loginMethod.sessionExpired"]
          : s["settings.loginMethod.passwordError"],
      )
      return
    }
    showToast(s["settings.loginMethod.passwordUpdated"], "success")
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={s["settings.loginMethod.setPassword"]}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={s["settings.loginMethod.setPassword"]}
          type="password"
          autoComplete="new-password"
          placeholder={s["settings.loginMethod.passwordPlaceholder"]}
          value={password}
          onChange={(e) => { setPasswordValue(e.target.value); setError("") }}
          error={error || undefined}
        />
        <Button type="submit" size="lg" loading={saving}>
          {s["settings.save"]}
        </Button>
      </form>
    </Modal>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const unblockUser = usePostStore((s) => s.unblockUser)
  const followRequests = usePostStore((s) => s.followRequests)
  const showToast = useToastStore((s) => s.show)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [provider, setProvider] = useState<"google" | "email" | null>(null)

  // Incoming follow requests (sent TO me) for the accept/reject list.
  const myIncoming = followRequests.filter((r) => r.targetId === currentUser?.id)

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400)
    return () => window.clearTimeout(timer)
  }, [])

  // Detect the login provider from auth metadata (google OAuth vs email).
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      const provider = data.user?.app_metadata?.provider as string | undefined
      setProvider(provider === "google" ? "google" : "email")
    })
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
    showToast(s["toast.loggedOut"], "success")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-32 w-full" />
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
        <div>
          <h1 className="text-h2 text-slate-900">{s["settings.pageTitle"]}</h1>
          <p className="text-body-sm text-slate-500">{s["app.name"]} · {currentUser.email}</p>
        </div>

        {/* Edit profile */}
        <Card className="flex items-center justify-between gap-3 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-semibold text-slate-900">{currentUser.name}</p>
              <p className="truncate text-xs text-slate-500">
                {currentUser.username ? `@${currentUser.username}` : s["settings.editProfile.description"]}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <User size={16} aria-hidden />
            {s["settings.editProfile.button"]}
          </Button>
        </Card>

        {/* Login method */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["settings.loginMethod.title"]}</h2>
          </div>
          <p className="text-body-sm text-slate-600">
            {provider === "google"
              ? s["settings.loginMethod.google"]
              : s["settings.loginMethod.email"]}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="max-w-sm text-body-sm text-slate-500">
              {s["settings.loginMethod.passwordHint"]}
            </p>
            <Button variant="outline" size="sm" onClick={() => setPasswordOpen(true)}>
              {provider === "google"
                ? s["settings.loginMethod.setPassword"]
                : s["settings.loginMethod.changePassword"]}
              <ChevronRight size={16} aria-hidden />
            </Button>
          </div>
        </Card>

        {/* Incoming follow requests */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["profile.followRequests.title"]}</h2>
          </div>
          {myIncoming.length === 0 ? (
            <p className="py-2 text-center text-body-sm text-slate-500">
              {s["profile.followRequests.empty"]}
            </p>
          ) : (
            <>
              <p className="text-body-sm text-slate-500">
                {s["profile.followRequests.description"]}
              </p>
              <ul>
                {myIncoming.map((r) => (
                  <FollowRequestCard key={r.id} requestId={r.id} userId={r.requesterId} />
                ))}
              </ul>
            </>
          )}
        </Card>

        {/* Blocked users */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <ShieldBan size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["profile.blockedUsers.title"]}</h2>
          </div>
          {blockedUserIds.length === 0 ? (
            <p className="py-2 text-center text-body-sm text-slate-500">
              {s["profile.blockedUsers.empty"]}
            </p>
          ) : (
            <>
              <p className="text-body-sm text-slate-500">
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
            </>
          )}
        </Card>

        {/* Log out */}
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <h2 className="text-h4">{s["settings.logout.title"]}</h2>
            <p className="text-body-sm text-slate-500">{s["settings.logout.description"]}</p>
          </div>
          <Button variant="danger" size="sm" loading={loggingOut} onClick={() => void handleLogout()}>
            <LogOut size={16} aria-hidden />
            {s["settings.logout.button"]}
          </Button>
        </Card>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
      <PasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  )
}
