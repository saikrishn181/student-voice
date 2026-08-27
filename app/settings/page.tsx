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
  Bell,
  GraduationCap,
  Ticket,
  Copy,
  Scale,
  ShieldCheck,
  HelpCircle,
  FileText,
  ChevronDown,
  BookOpen,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { Card, Avatar, EmptyState, Skeleton, Button, Input, Modal } from "@/components/ui"
import { CollegeBadge } from "@/components/feature"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useNotificationStore } from "@/lib/store/useNotificationStore"
import { useUserById } from "@/hooks"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
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
  const notificationPrefs = useNotificationStore((s) => s.preferences)
  const updateNotificationPrefs = useNotificationStore((s) => s.updatePreferences)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [provider, setProvider] = useState<"google" | "email" | null>(null)
  const [collegeEmail, setCollegeEmail] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [openFaq, setOpenFaq] = useState<string | null>(null)

  // Incoming follow requests (sent TO me) for the accept/reject list.
  const myIncoming = followRequests.filter((r) => r.targetId === currentUser?.id)

  const notificationTypes: { type: string; label: string }[] = [
    { type: "support", label: s["notification.type.support"] },
    { type: "comment", label: s["notification.type.comment"] },
    { type: "follow", label: s["notification.type.follow"] },
    { type: "follow_request", label: s["notification.type.follow_request"] },
    { type: "offer_help", label: s["notification.type.offer_help"] },
    { type: "verification_approved", label: s["notification.type.verification_approved"] },
  ]

  const toggleMutedType = (type: string) => {
    if (!currentUser) return
    const muted = new Set(notificationPrefs?.mutedTypes ?? [])
    if (muted.has(type)) muted.delete(type)
    else muted.add(type)
    void updateNotificationPrefs(currentUser.id, { mutedTypes: Array.from(muted) })
  }

  const setDigestFrequency = (freq: "instant" | "daily" | "never") => {
    if (!currentUser) return
    void updateNotificationPrefs(currentUser.id, { digestFrequency: freq })
  }

  const handleVerifyCollege = async () => {
    const email = collegeEmail.trim()
    if (!email) return
    setVerifying(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.rpc("verify_college_email", {
        p_email: email,
      })
      if (error) {
        showToast(error.message ?? s["validation.generic"], "error")
        return
      }
      if (data === "ok") {
        await useAuthStore.getState().refreshProfile()
        const fresh = useAuthStore.getState().currentUser
        if (fresh) showToast(s["settings.college.verified"], "success")
        setCollegeEmail("")
      } else if (data === "not_college") {
        showToast(s["settings.college.notCollege"], "error")
      } else {
        showToast(s["settings.college.invalid"], "error")
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleCopyInvite = async () => {
    if (!currentUser) return
    const code = currentUser.inviteCode
    if (!code) return
    const link = `${window.location.origin}/signup?invite=${encodeURIComponent(code)}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast(s["settings.invite.copyFailed"], "error")
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 400)
    return () => window.clearTimeout(timer)
  }, [])

  // Notification preferences (per-type mute + email digest frequency).
  useEffect(() => {
    if (!currentUser) return
    void useNotificationStore.getState().loadPreferences(currentUser.id)
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Notification preferences */}
        <Card className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["settings.notifications.title"]}</h2>
          </div>

          <div>
            <p className="mb-2 text-body-sm font-semibold text-slate-700">
              {s["settings.notifications.typesTitle"]}
            </p>
            <div className="flex flex-col gap-1.5">
              {notificationTypes.map(({ type, label }) => {
                const muted = (notificationPrefs?.mutedTypes ?? []).includes(type)
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleMutedType(type)}
                    aria-pressed={!muted}
                    className="flex items-center justify-between gap-3 rounded-card px-2 py-1.5 text-left transition-app hover:bg-slate-50"
                  >
                    <span className="text-body-sm text-slate-700">{label}</span>
                    <span
                      className={cn(
                        "relative h-6 w-10 shrink-0 rounded-pill transition-colors",
                        muted ? "bg-slate-200" : "bg-primary-500",
                      )}
                      aria-hidden
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                          muted ? "left-0.5" : "left-[18px]",
                        )}
                      />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-body-sm font-semibold text-slate-700">
              {s["settings.notifications.digestTitle"]}
            </p>
            <p className="mb-2 text-body-sm text-slate-500">
              {s["settings.notifications.digestHint"]}
            </p>
            <div className="flex flex-col gap-1.5">
              {(
                [
                  ["instant", s["settings.notifications.digest.instant"]],
                  ["daily", s["settings.notifications.digest.daily"]],
                  ["never", s["settings.notifications.digest.never"]],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDigestFrequency(value)}
                  aria-pressed={notificationPrefs?.digestFrequency === value}
                  className="flex items-center gap-2.5 rounded-card px-2 py-1.5 text-left transition-app hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      notificationPrefs?.digestFrequency === value
                        ? "border-primary-500 bg-primary-500"
                        : "border-slate-300 bg-white",
                    )}
                    aria-hidden
                  >
                    {notificationPrefs?.digestFrequency === value ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                    ) : null}
                  </span>
                  <span className="text-body-sm text-slate-700">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* College email verification */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["settings.college.title"]}</h2>
            {currentUser.collegeVerified ? (
              <CollegeBadge />
            ) : null}
          </div>
          {currentUser.collegeVerified ? (
            <div className="flex flex-col gap-1">
              <p className="text-body-sm text-slate-700">
                {s["settings.college.verifiedAs"](currentUser.collegeName ?? "")}
              </p>
              <p className="text-body-sm text-slate-500">
                {s["settings.college.verifiedEmail"](currentUser.collegeEmail ?? "")}
              </p>
            </div>
          ) : (
            <>
              <p className="text-body-sm text-slate-600">{s["settings.college.description"]}</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  label={s["settings.college.emailLabel"]}
                  name="college-email"
                  type="email"
                  value={collegeEmail}
                  onChange={(e) => setCollegeEmail(e.target.value)}
                  placeholder="you@college.edu.in"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  className="sm:self-end"
                  loading={verifying}
                  disabled={!collegeEmail.trim()}
                  onClick={handleVerifyCollege}
                >
                  <Check size={16} aria-hidden /> {s["settings.college.verifyButton"]}
                </Button>
              </div>
            </>
          )}
        </Card>

        {/* Referral invite */}
        <Card className="flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <Ticket size={18} className="text-slate-400" aria-hidden />
            <h2 className="text-h4">{s["settings.invite.title"]}</h2>
          </div>
          <p className="text-body-sm text-slate-600">{s["settings.invite.description"]}</p>
          {currentUser.inviteCode ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 truncate rounded-card border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-800">
                {currentUser.inviteCode}
              </code>
              <Button variant="outline" onClick={handleCopyInvite}>
                {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
                {copied ? s["settings.invite.copied"] : s["settings.invite.copy"]}
              </Button>
            </div>
          ) : null}
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

        {/* Legal, Rules & Platform Trust Hub */}
        <Card className="flex flex-col gap-4 p-4 sm:p-5 border-l-4 border-l-primary-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale size={20} className="text-primary-600" aria-hidden />
              <h2 className="text-h4">Legal, Rules & Platform Trust</h2>
            </div>
            <span className="rounded-pill bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
              100% Legally Protected
            </span>
          </div>
          <p className="text-body-sm text-slate-600">
            Learn about your constitutional rights, how Krantind protects student whistleblowers under Indian law, and our platform terms.
          </p>

          {/* Legal Quick Links Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Link
              href="/terms"
              className="flex flex-col items-center justify-center p-2.5 rounded-card border border-slate-200 bg-slate-50 text-center hover:bg-primary-50 hover:border-primary-300 transition-colors"
            >
              <FileText size={18} className="text-primary-700 mb-1" />
              <span className="text-xs font-bold text-slate-800">Terms of Service</span>
            </Link>

            <Link
              href="/privacy"
              className="flex flex-col items-center justify-center p-2.5 rounded-card border border-slate-200 bg-slate-50 text-center hover:bg-primary-50 hover:border-primary-300 transition-colors"
            >
              <ShieldCheck size={18} className="text-emerald-700 mb-1" />
              <span className="text-xs font-bold text-slate-800">Privacy Policy</span>
            </Link>

            <Link
              href="/grievance"
              className="flex flex-col items-center justify-center p-2.5 rounded-card border border-slate-200 bg-slate-50 text-center hover:bg-primary-50 hover:border-primary-300 transition-colors"
            >
              <Scale size={18} className="text-amber-700 mb-1" />
              <span className="text-xs font-bold text-slate-800">Grievance Redressal</span>
            </Link>

            <Link
              href="/guidelines"
              className="flex flex-col items-center justify-center p-2.5 rounded-card border border-slate-200 bg-slate-50 text-center hover:bg-primary-50 hover:border-primary-300 transition-colors"
            >
              <BookOpen size={18} className="text-purple-700 mb-1" />
              <span className="text-xs font-bold text-slate-800">Campus Rules</span>
            </Link>
          </div>

          {/* Interactive FAQs Accordion */}
          <div className="mt-2 flex flex-col gap-2">
            {/* FAQ 1 */}
            <div className="rounded-card border border-slate-200 bg-slate-50/70 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === "legal" ? null : "legal")}
                className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>🏛️</span> Is Krantind fully legal under Indian law?
                </span>
                <ChevronDown
                  size={16}
                  className={cn("text-slate-400 transition-transform", openFaq === "legal" && "rotate-180")}
                />
              </button>
              {openFaq === "legal" ? (
                <div className="border-t border-slate-200 bg-white p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
                  <p>
                    <strong>Yes, 100%.</strong> Krantind is protected under <strong>Article 19(1)(a) of the Constitution of India</strong> (Freedom of Speech and Expression). Students have the constitutional right to discuss campus problems, fee transparency, hostel conditions, and educational welfare.
                  </p>
                  <p>
                    Furthermore, under <strong>Section 79 of the Information Technology Act, 2000</strong>, Krantind operates as a protected Intermediary, with zero civil or criminal platform liability for third-party student posts.
                  </p>
                </div>
              ) : null}
            </div>

            {/* FAQ 2 */}
            <div className="rounded-card border border-slate-200 bg-slate-50/70 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === "anonymous" ? null : "anonymous")}
                className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>🎭</span> How does Anonymous Whistleblower mode protect me from college retaliation?
                </span>
                <ChevronDown
                  size={16}
                  className={cn("text-slate-400 transition-transform", openFaq === "anonymous" && "rotate-180")}
                />
              </button>
              {openFaq === "anonymous" ? (
                <div className="border-t border-slate-200 bg-white p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
                  <p>
                    When you post in Anonymous Mode, your name, profile photo, username, and profile link are completely stripped from public view and college administrators. It displays simply as <em>&ldquo;Anonymous Student • [College Name]&rdquo;</em>.
                  </p>
                  <p>
                    College principals or professors cannot demand your identity from Krantind without a formal judicial subpoena from an Indian High Court.
                  </p>
                </div>
              ) : null}
            </div>

            {/* FAQ 3 */}
            <div className="rounded-card border border-slate-200 bg-slate-50/70 overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === "college" ? null : "college")}
                className="flex w-full items-center justify-between p-3 text-left text-xs font-bold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>🏫</span> What happens if my college threatens legal action over a post?
                </span>
                <ChevronDown
                  size={16}
                  className={cn("text-slate-400 transition-transform", openFaq === "college" && "rotate-180")}
                />
              </button>
              {openFaq === "college" ? (
                <div className="border-t border-slate-200 bg-white p-3 text-xs text-slate-600 leading-relaxed space-y-1.5">
                  <p>
                    Colleges often send cease-and-desist letters to suppress criticism. However, highlighting institutional issues (mess food quality, broken lab equipment, fee receipts, late buses) is legitimate student feedback and not defamation under Indian law.
                  </p>
                  <p>
                    If college authorities have a genuine legal takedown notice (e.g. for personal slurs or unverified claims), they must submit it formally to our <Link href="/grievance" className="text-primary-600 underline font-semibold">Grievance Portal</Link> under Rule 3(2) of the IT Rules 2021.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
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
