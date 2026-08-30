"use client"

// Login: email + password, validate empty fields, then sign in via Supabase
// through the auth store and redirect to /feed (a returning user already has
// a region set).
import { useState, useEffect, useRef, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, Lock, UserPlus, Users, Trash2, ArrowRightLeft, AlertCircle } from "lucide-react"
import { Button, Input, Spinner, Modal } from "@/components/ui"
import { Avatar } from "@/components/ui/Avatar"
import { GoogleIcon, Logo } from "@/components/feature"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { getSavedAccounts, removeSavedAccount, type SavedAccount } from "@/lib/savedAccounts"
import { LOGGED_IN_HOME } from "@/constants"
import { cn } from "@/lib/utils"
import s from "@/lib/strings"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getSafeRedirect(next: string | null): string {
  if (!next) return LOGGED_IN_HOME
  if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    return next
  }
  return LOGGED_IN_HOME
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const switchAccount = useAuthStore((s) => s.switchAccount)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const showToast = useToastStore((s) => s.show)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<SavedAccount | null>(null)

  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef<boolean>(false)

  const isAddAccount = searchParams.get("add_account") === "true"

  useEffect(() => {
    setSavedAccounts(getSavedAccounts())
    const qEmail = searchParams.get("email")
    if (qEmail) {
      setEmail(qEmail.trim())
    }
  }, [searchParams])

  const handleSelectSavedAccount = async (account: SavedAccount) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false
      return
    }

    if (account.session?.access_token) {
      setSwitchingId(account.id)
      const res = await switchAccount(account.id)
      setSwitchingId(null)
      if (res.ok) {
        showToast(`Welcome back, ${account.name}!`, "success")
        const next = searchParams.get("next")
        router.push(getSafeRedirect(next))
        return
      }
    }

    // Prefill email and focus password
    setEmail(account.email || "")
    setEmailError("")
    if (passwordInputRef.current) {
      passwordInputRef.current.focus()
    }
  }

  const handleTouchStart = (account: SavedAccount) => {
    isLongPressRef.current = false
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50)
      }
      setAccountToDelete(account)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const confirmRemoveAccount = (account: SavedAccount) => {
    const updated = removeSavedAccount(account.id)
    setSavedAccounts(updated)
    setAccountToDelete(null)
    showToast(`Removed ${account.name} from this device. The account remains safe online.`, "info")
    if (email === account.email) {
      setEmail("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")
    setPasswordError("")

    let hasError = false
    if (!email.trim()) {
      setEmailError("Email is required")
      hasError = true
    } else if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Please enter a valid email address")
      hasError = true
    }
    if (!password) {
      setPasswordError("Password is required")
      hasError = true
    }
    if (hasError) return

    setLoading(true)
    const result = await login(email.trim(), password)
    setLoading(false)

    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
      return
    }
    showToast(s["toast.loginSuccess"], "success")
    const next = searchParams.get("next")
    router.push(getSafeRedirect(next))
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const next = searchParams.get("next")
    const result = await signInWithGoogle(next ?? undefined)
    setGoogleLoading(false)
    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-gradient-to-b from-paper to-paper-deep px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="transition-app hover:opacity-90">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="surface-card p-6 sm:p-8">
          {isAddAccount && (
            <div className="mb-5 flex items-start justify-between gap-3 rounded-card border border-primary-200 bg-primary-50 p-3 text-xs text-primary-950">
              <div className="flex items-start gap-2">
                <UserPlus size={16} className="mt-0.5 shrink-0 text-primary-700" />
                <div>
                  <p className="font-bold">Add another account</p>
                  <p className="text-slate-600 mt-0.5">Sign in to add this account to your device.</p>
                </div>
              </div>
              <Link href="/feed" className="text-xs font-semibold text-primary-700 hover:underline shrink-0">
                Cancel
              </Link>
            </div>
          )}

          <h1 className="text-h2 text-slate-900">{isAddAccount ? "Add Account" : s["auth.login.title"]}</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            {isAddAccount ? "Sign into an existing student or organization account" : s["auth.login.subtitle"]}
          </p>

          {/* Saved accounts on this device */}
          {savedAccounts.length > 0 && !isAddAccount && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Saved on this device
              </p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto scroll-slim">
                {savedAccounts.map((acc) => {
                  const isSelected = email.toLowerCase() === acc.email.toLowerCase()
                  const isSwitching = switchingId === acc.id

                  return (
                    <div
                      key={acc.id}
                      onTouchStart={() => handleTouchStart(acc)}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchEnd}
                      onMouseDown={() => handleTouchStart(acc)}
                      onMouseUp={handleTouchEnd}
                      onMouseLeave={handleTouchEnd}
                      onClick={() => handleSelectSavedAccount(acc)}
                      className={cn(
                        "group flex select-none items-center justify-between gap-2.5 rounded-card border p-2.5 transition-all cursor-pointer",
                        isSelected
                          ? "border-primary-500 bg-primary-50/50 ring-1 ring-primary-500"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={acc.name} src={acc.avatarUrl} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-900">{acc.name}</p>
                          <p className="truncate text-[11px] text-slate-500">
                            {acc.email || acc.state || "Saved Account"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isSwitching ? (
                          <Spinner size={14} />
                        ) : (
                          <span className="text-[11px] font-semibold text-primary-700 group-hover:underline">
                            Select
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label={`Remove ${acc.name} from device`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setAccountToDelete(acc)
                          }}
                          className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove from device"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Tap to select • Long-press or tap trash to remove from device
              </p>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            className="mt-5"
            loading={googleLoading}
            onClick={handleGoogle}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            {s["auth.google.continue"]}
          </Button>

          <div className="mt-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
              placeholder={s["auth.login.emailPlaceholder"]}
              autoComplete="email"
              error={emailError || undefined}
              leftAdornment={<Mail size={18} className="text-slate-400" />}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                ref={passwordInputRef}
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                placeholder="Enter your password"
                autoComplete="current-password"
                error={passwordError || undefined}
                leftAdornment={<Lock size={18} className="text-slate-400" />}
              />
              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary-700 hover:underline"
                >
                  {s["auth.login.forgot"]}
                </Link>
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth loading={loading}>
              {s["auth.login.button"]}
            </Button>
          </form>

          <p className="mt-6 text-center text-body-sm text-slate-500">
            {s["auth.login.noAccount"]}{" "}
            <Link href="/signup" className="font-semibold text-primary-700 hover:underline">
              {s["auth.login.signupLink"]}
            </Link>
          </p>
        </div>
      </div>

      {/* Remove Account Confirmation Dialog on Login */}
      <Modal
        open={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <span>Remove Account from Device?</span>
          </div>
        }
        className="sm:max-w-md"
      >
        {accountToDelete && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3 rounded-card bg-slate-50 border border-slate-200 p-3">
              <Avatar name={accountToDelete.name} src={accountToDelete.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{accountToDelete.name}</p>
                <p className="text-xs text-slate-500 truncate">{accountToDelete.email || accountToDelete.state}</p>
              </div>
            </div>

            <div className="rounded-card border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-amber-900">
                <span>🛡️</span> Your account remains safe online!
              </p>
              <p className="text-slate-700">
                This will only remove <strong>{accountToDelete.name}</strong> from this browser/device.
              </p>
              <p className="text-slate-600">
                To log back in later, you can enter your email/ID and password anytime.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <Button variant="outline" size="sm" onClick={() => setAccountToDelete(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={() => confirmRemoveAccount(accountToDelete)}>
                <Trash2 size={14} className="mr-1.5" />
                Remove from Device
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh w-full items-center justify-center">
          <Spinner size={28} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
