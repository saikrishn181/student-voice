"use client"

// Login: email + password, validate empty fields, then sign in via Supabase
// through the auth store and redirect to /feed (a returning user already has
// a region set).
import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Megaphone } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { GoogleIcon } from "@/components/feature/GoogleIcon"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { LOGGED_IN_HOME } from "@/constants"
import s from "@/lib/strings"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const login = useAuthStore((s) => s.login)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const showToast = useToastStore((s) => s.show)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailError, setEmailError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")

    if (!email.trim() || !password) {
      showToast(s["validation.emailPassword"], "error")
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Please enter a valid email address")
      return
    }

    setLoading(true)
    const result = await login(email.trim(), password)
    setLoading(false)

    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
      return
    }
    showToast(s["toast.loginSuccess"], "success")
    const next = searchParams.get("next")
    router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : LOGGED_IN_HOME)
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
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} aria-hidden />
          </span>
          <span className="text-xl font-bold text-primary-700">{s["app.name"]}</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <h1 className="text-h2 text-slate-900">{s["auth.login.title"]}</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            {s["auth.login.subtitle"]}
          </p>

          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            className="mt-6"
            loading={googleLoading}
            onClick={handleGoogle}
          >
            <GoogleIcon className="mr-2 h-5 w-5" />
            {s["auth.google.continue"]}
          </Button>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
              placeholder={s["auth.login.emailPlaceholder"]}
              autoComplete="email"
              error={emailError || undefined}
            />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
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

          <p className="mt-5 text-center text-body-sm text-slate-500">
            {s["auth.login.noAccount"]}{" "}
            <Link href="/signup" className="font-semibold text-primary-700 hover:underline">
              {s["auth.login.signupLink"]}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}