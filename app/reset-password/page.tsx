"use client"

// Reset Password: handles the email link sent by /forgot-password.
// The email link arrives with a `code` (Supabase PKCE flow). We exchange it
// for a session, then let the user pick a new password which is applied with
// auth.updateUser. After success the user is signed out and sent to /login.
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Megaphone, KeyRound, CheckCircle2 } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import s from "@/lib/strings"

function ResetPasswordInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const showToast = useToastStore((s) => s.show)

  const [state, setState] = useState<"exchanging" | "form" | "done" | "invalid">("exchanging")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  // Exchange the one-time `code` from the email link for a session.
  useEffect(() => {
    const code = searchParams.get("code")
    if (!code) {
      setState("invalid")
      return
    }
    const supabase = createSupabaseBrowserClient()
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          setState("invalid")
          return
        }
        // Confirm the user is actually authenticated with a recovery session.
        supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user) {
            setState("form")
          } else {
            setState("invalid")
          }
        })
      })
      .catch(() => setState("invalid"))
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("Password should be at least 6 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setSaving(true)
    const supabase = createSupabaseBrowserClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (updateError) {
      setError(updateError.message || "Could not update the password. Please try again.")
      return
    }

    // Sign out so the user logs in freshly with the new password.
    await supabase.auth.signOut()
    setState("done")
    showToast("Password updated successfully", "success")
  }

  if (state === "exchanging") {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-paper px-4 text-center">
        <div className="text-body-sm text-slate-500">Verifying your reset link…</div>
      </div>
    )
  }

  if (state === "invalid") {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-slate-200 text-slate-500">
          <KeyRound size={28} aria-hidden />
        </span>
        <h1 className="text-h2 text-slate-900">Reset link invalid</h1>
        <p className="mt-2 max-w-sm text-body-sm text-slate-500">
          This reset link is missing, expired, or was already used. Request a new one below.
        </p>
        <div className="mt-6">
          <Link href="/forgot-password">
            <Button variant="outline">Request a new link</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (state === "done") {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-emerald-600 text-white">
          <CheckCircle2 size={28} aria-hidden />
        </span>
        <h1 className="text-h2 text-slate-900">Password updated</h1>
        <p className="mt-2 max-w-sm text-body-sm text-slate-500">
          You can now log in with your new password.
        </p>
        <div className="mt-6">
          <Button onClick={() => router.push("/login")}>Go to Log In</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-primary-700 text-white">
          <Megaphone size={28} aria-hidden />
        </span>
        <h1 className="text-h2 text-slate-900">Choose a new password</h1>
        <p className="mt-2 text-body-sm text-slate-500">
          It will take effect the next time you log in.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
          <Input
            label="New password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError("") }}
            placeholder="At least 6 characters"
            error={error || undefined}
          />
          <Input
            label="Confirm new password"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setError("") }}
            placeholder="Re-enter the password"
          />
          <Button type="submit" size="lg" fullWidth loading={saving}>
            Update password
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-paper" />}>
      <ResetPasswordInner />
    </Suspense>
  )
}