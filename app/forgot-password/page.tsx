"use client"

// Forgot Password: sends a password-reset email via Supabase
// (supabase.auth.resetPasswordForEmail). Shows a confirmation screen after the
// request is accepted; Supabase handles the actual reset via email link.
import { useState } from "react"
import Link from "next/link"
import { Megaphone, MailCheck } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import s from "@/lib/strings"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordPage() {
  const showToast = useToastStore((s) => s.show)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")

    if (!email.trim()) {
      setEmailError("Please enter your email address")
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Please enter a valid email address")
      return
    }

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/login`,
    })
    setLoading(false)

    if (error) {
      showToast(error.message || "Something went wrong. Please try again.", "error")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-primary-700 text-white">
          <MailCheck size={28} aria-hidden />
        </span>
        <h1 className="text-h2 text-slate-900">{s["auth.forgotPassword.sentTitle"]}</h1>
        <p className="mt-2 max-w-sm text-body-sm text-slate-500">
          {s["auth.forgotPassword.sentDescription"](email.trim())}
        </p>
        <div className="mt-6">
          <Link href="/login">
            <Button variant="outline">{s["auth.forgotPassword.backToLogin"]}</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <span className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-card bg-primary-700 text-white">
          <Megaphone size={28} aria-hidden />
        </span>
        <h1 className="text-h2 text-slate-900">{s["auth.forgotPassword.title"]}</h1>
        <p className="mt-2 text-body-sm text-slate-500">
          {s["auth.forgotPassword.subtitle"]}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
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
          <Button type="submit" size="lg" fullWidth loading={loading}>
            {s["auth.forgotPassword.sendLink"]}
          </Button>
        </form>

        <div className="mt-5">
          <Link href="/login" className="text-sm font-medium text-primary-700 hover:underline">
            {s["auth.forgotPassword.backToLogin"]}
          </Link>
        </div>
      </div>
    </div>
  )
}