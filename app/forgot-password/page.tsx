"use client"

// Forgot Password: two free options, both powered by Supabase's built-in
// email (no paid SMS provider needed):
//  1. "Email code (OTP)" (default) — Supabase emails a 6-digit code; the user
//     enters it here with a new password, we verify the OTP, set the new
//     password, and log them straight in.
//  2. "Reset link" — Supabase emails a link that opens /reset-password.
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MailCheck, KeyRound } from "lucide-react"
import { Button, Input, Tabs } from "@/components/ui"
import { Logo } from "@/components/feature"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { LOGGED_IN_HOME } from "@/constants"
import s from "@/lib/strings"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Method = "link" | "otp"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const showToast = useToastStore((s) => s.show)
  const [method, setMethod] = useState<Method>("otp")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const validateEmail = () => {
    setEmailError("")
    if (!email.trim()) {
      setEmailError("Please enter your email address")
      return false
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("Please enter a valid email address")
      return false
    }
    return true
  }

  const handleSendLink = async () => {
    if (!validateEmail()) return
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) {
      showToast(error.message || "Something went wrong. Please try again.", "error")
      return
    }
    setSent(true)
  }

  // OTP step 1: request a 6-digit code (Supabase sends it by email — free).
  const handleRequestCode = async () => {
    if (!validateEmail()) return
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setLoading(false)
    if (error) {
      showToast(error.message || "Something went wrong. Please try again.", "error")
      return
    }
    setCodeSent(true)
  }

  // OTP step 2: verify the code (establishes a session), set the password,
  // and log the user straight in.
  const handleVerifyCode = async () => {
    if (!code.trim()) {
      showToast(s["auth.forgotPassword.codeRequired"], "error")
      return
    }
    if (newPassword.length < 6) {
      showToast(s["auth.forgotPassword.passwordTooShort"], "error")
      return
    }
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    })
    if (verifyError) {
      setLoading(false)
      showToast(
        verifyError.message?.includes("Token")
          ? s["auth.forgotPassword.codeInvalid"]
          : verifyError.message,
        "error",
      )
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    setLoading(false)
    if (updateError) {
      showToast(updateError.message || "Could not update your password", "error")
      return
    }
    showToast(s["auth.forgotPassword.passwordUpdated"], "success")
    router.push(LOGGED_IN_HOME)
  }

  if (sent) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4 text-center">
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
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 flex justify-center">
          <Link href="/" className="transition-app hover:opacity-90">
            <Logo size="lg" showWordmark={false} />
          </Link>
        </div>
        <h1 className="text-h2 text-slate-900">{s["auth.forgotPassword.title"]}</h1>
        <p className="mt-2 text-body-sm text-slate-500">
          {s["auth.forgotPassword.subtitle"]}
        </p>

        <div className="mt-6 text-left">
          <Tabs<Method>
            tabs={[
              { value: "otp", label: s["auth.forgotPassword.tabOtp"] },
              { value: "link", label: s["auth.forgotPassword.tabLink"] },
            ]}
            value={method}
            onChange={setMethod}
          />
        </div>

        <form
          className="mt-4 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (method === "link") handleSendLink()
            else if (!codeSent) handleRequestCode()
            else handleVerifyCode()
          }}
          noValidate
        >
          {!codeSent ? (
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
          ) : (
            <>
              <Input
                label={s["auth.forgotPassword.codeLabel"]}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                placeholder={s["auth.forgotPassword.codePlaceholder"]}
                maxLength={6}
              />
              <Input
                label={s["auth.forgotPassword.newPasswordLabel"]}
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={s["auth.forgotPassword.newPasswordPlaceholder"]}
                autoComplete="new-password"
              />
            </>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {method === "link"
              ? s["auth.forgotPassword.sendLink"]
              : codeSent
                ? s["auth.forgotPassword.verifyButton"]
                : s["auth.forgotPassword.sendCode"]}
          </Button>
        </form>

        {codeSent ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-body-sm text-slate-500">
            <KeyRound size={14} aria-hidden /> {s["auth.forgotPassword.codeSentTo"](email.trim())}
          </p>
        ) : null}

        <div className="mt-5">
          <Link href="/login" className="text-sm font-medium text-primary-700 hover:underline">
            {s["auth.forgotPassword.backToLogin"]}
          </Link>
        </div>
      </div>
    </div>
  )
}