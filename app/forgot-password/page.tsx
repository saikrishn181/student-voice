"use client"

// Forgot Password: two free options, both powered by Supabase's built-in
// email (no paid SMS provider needed):
//  1. "Email code (OTP)" (default) — Supabase emails a 6-digit code; the user
//     enters it here with a new password, we verify the OTP, set the new
//     password, and log them straight in.
//  2. "Reset link" — Supabase emails a link that opens /reset-password.
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MailCheck, KeyRound, Lock } from "lucide-react"
import { Button, Input, Tabs } from "@/components/ui"
import { Logo } from "@/components/feature"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { LOGGED_IN_HOME } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
type Method = "otp" | "link"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const showToast = useToastStore((s) => s.show)
  const [method, setMethod] = useState<Method>("otp")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [code, setCode] = useState("")
  const [codeError, setCodeError] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmError, setConfirmError] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [otpCountdown, setOtpCountdown] = useState(0)

  // 60-second countdown for resending OTP
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

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

  // OTP step 1: request a 6-digit code via email
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
      showToast(error.message || "Could not send verification code. Please check your email and try again.", "error")
      return
    }
    setCodeSent(true)
    setOtpCountdown(60)
    showToast("Verification code sent to your email!", "success")
  }

  // OTP step 2: verify the code, set the new password, and log the user in
  const handleVerifyCode = async () => {
    setCodeError("")
    setPasswordError("")
    setConfirmError("")

    let hasError = false
    const cleanCode = code.trim()
    if (!cleanCode) {
      setCodeError("Please enter the 6-digit verification code")
      hasError = true
    } else if (cleanCode.length < 6) {
      setCodeError("Code must be 6 digits")
      hasError = true
    }

    if (!newPassword) {
      setPasswordError("New password is required")
      hasError = true
    } else if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      hasError = true
    }

    if (!confirmPassword) {
      setConfirmError("Please confirm your new password")
      hasError = true
    } else if (newPassword && newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match")
      hasError = true
    }

    if (hasError) return

    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: cleanCode,
      type: "email",
    })
    if (verifyError) {
      setLoading(false)
      const msg = verifyError.message?.includes("Token")
        ? "Invalid or expired verification code."
        : verifyError.message
      setCodeError(msg)
      showToast(msg, "error")
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

    showToast("Password updated successfully!", "success")
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
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4 py-8">
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
            onChange={(m) => {
              setMethod(m)
              setCodeSent(false)
              setEmailError("")
            }}
          />
        </div>

        <form
          className="mt-4 flex flex-col gap-4 text-left"
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
              <div className="rounded-card border border-primary-200 bg-primary-50/60 p-3 text-xs text-slate-700 text-center">
                <p>
                  We sent a 6-digit OTP code to <strong>{email.trim()}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => { setCodeSent(false); setCode(""); setCodeError("") }}
                  className="mt-1 font-semibold text-primary-700 hover:underline"
                >
                  Change Email
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 text-center">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, ""))
                    setCodeError("")
                  }}
                  placeholder="000000"
                  className={cn(
                    "w-full rounded-card border bg-white px-4 py-2.5 text-center font-mono text-xl font-bold tracking-[0.3em] text-slate-900 placeholder:text-slate-300 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100",
                    codeError ? "border-red-500" : "border-slate-200"
                  )}
                  aria-label="6-digit reset code"
                />
                {codeError ? (
                  <p className="mt-1 text-center text-xs font-semibold text-red-600">
                    {codeError}
                  </p>
                ) : null}
              </div>

              <Input
                label="New Password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError("") }}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                error={passwordError || undefined}
                leftAdornment={<Lock size={17} className="text-slate-400" />}
              />

              <Input
                label="Confirm New Password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError("") }}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                error={confirmError || undefined}
                leftAdornment={<Lock size={17} className="text-slate-400" />}
              />
            </>
          )}

          <Button type="submit" size="lg" fullWidth loading={loading}>
            {method === "link"
              ? s["auth.forgotPassword.sendLink"]
              : codeSent
                ? "Update Password & Log In"
                : s["auth.forgotPassword.sendCode"]}
          </Button>

          {codeSent && method === "otp" ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                disabled={otpCountdown > 0}
                onClick={handleRequestCode}
                className={cn(
                  "text-xs font-semibold transition-colors",
                  otpCountdown > 0
                    ? "text-slate-400 cursor-not-allowed"
                    : "text-primary-700 hover:text-primary-800 underline"
                )}
              >
                {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend OTP Code"}
              </button>
            </div>
          ) : null}
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