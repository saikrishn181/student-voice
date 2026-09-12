"use client"

// Signup: toggle Student / Organization account type, validate, then create the
// account via Supabase (through the auth store) and go to Region Selection.
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail } from "lucide-react"
import { Button, Input, Select, Tabs } from "@/components/ui"
import { GoogleIcon, Logo } from "@/components/feature"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { ORGANIZATION_TYPES, POST_SIGNUP_ROUTE } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { AccountType, OrganizationType } from "@/lib/types"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function SignupPage() {
  const router = useRouter()
  const signup = useAuthStore((s) => s.signup)
  const verifySignupOtp = useAuthStore((s) => s.verifySignupOtp)
  const resendSignupOtp = useAuthStore((s) => s.resendSignupOtp)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const showToast = useToastStore((s) => s.show)

  const [step, setStep] = useState<"form" | "otp">("form")
  const [accountType, setAccountType] = useState<AccountType>("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [organizationType, setOrganizationType] = useState<OrganizationType | "">("")
  const [loading, setLoading] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [nameError, setNameError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [confirmPasswordError, setConfirmPasswordError] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpError, setOtpError] = useState("")
  const [otpCountdown, setOtpCountdown] = useState(0)
  const [inviteCode, setInviteCode] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState("")

  // Prefill from an invite link like /signup?invite=ABC12345.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("invite")
    if (code) setInviteCode(code.trim())
  }, [])

  // 60-second cooldown timer for resending OTP
  useEffect(() => {
    if (otpCountdown <= 0) return
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000)
    return () => clearInterval(timer)
  }, [otpCountdown])

  const clearErrors = () => {
    setNameError("")
    setEmailError("")
    setPasswordError("")
    setConfirmPasswordError("")
    setTermsError("")
    setOtpError("")
  }

  const handleGoogle = async () => {
    if (!acceptedTerms) {
      setTermsError("Please agree to the Terms of Service and Privacy Policy before continuing with Google.")
      showToast("Please agree to the Terms of Service and Privacy Policy", "error")
      return
    }
    setGoogleLoading(true)
    const result = await signInWithGoogle()
    setGoogleLoading(false)
    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearErrors()

    let hasError = false
    if (!name.trim()) {
      setNameError("Name is required")
      hasError = true
    }
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
    } else if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      hasError = true
    }
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password")
      hasError = true
    } else if (password && password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match")
      hasError = true
    }
    if (accountType === "organization" && !organizationType) {
      showToast(s["validation.orgTypeRequired"], "error")
      hasError = true
    }
    if (!acceptedTerms) {
      setTermsError("You must agree to the Terms of Service and Privacy Policy to create an account.")
      showToast("Please agree to the Terms of Service and Privacy Policy", "error")
      hasError = true
    }
    if (hasError) return

    setLoading(true)

    const resolvedOrgType: OrganizationType | undefined =
      accountType === "organization" && organizationType ? organizationType : undefined
    const result = await signup({
      name: name.trim(),
      email: email.trim(),
      password,
      accountType,
      organizationType: resolvedOrgType,
      inviteCode: inviteCode.trim() || undefined,
    })
    setLoading(false)

    if (!result.ok) {
      showToast(result.error ?? "Unable to create your account. Please try again.", "error")
      return
    }

    if (result.requiresOtp) {
      setStep("otp")
      setOtpCountdown(60)
      showToast("Verification code sent to your email!", "success")
    } else {
      showToast(s["toast.signupSuccess"], "success")
      router.push(POST_SIGNUP_ROUTE)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setOtpError("")
    const cleanOtp = otpCode.trim()
    if (!cleanOtp) {
      setOtpError("Please enter the 6-digit verification code")
      return
    }
    if (cleanOtp.length < 6) {
      setOtpError("Code must be 6 digits")
      return
    }

    setOtpLoading(true)
    const result = await verifySignupOtp(email.trim(), cleanOtp)
    setOtpLoading(false)

    if (!result.ok) {
      setOtpError(result.error ?? "Invalid or expired verification code.")
      showToast(result.error ?? "Invalid verification code", "error")
      return
    }

    showToast("Email verified successfully!", "success")
    router.push(POST_SIGNUP_ROUTE)
  }

  const handleResendOtp = async () => {
    if (otpCountdown > 0) return
    const result = await resendSignupOtp(email.trim())
    if (result.ok) {
      setOtpCountdown(60)
      showToast("A new verification code has been sent to your email.", "success")
    } else {
      showToast(result.error ?? "Could not resend verification code. Please try again.", "error")
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-paper px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="transition-app hover:opacity-90">
            <Logo size="lg" />
          </Link>
        </div>

        <div className="surface-card p-6 sm:p-8">
          {step === "otp" ? (
            /* Step 2: Email OTP Verification Screen */
            <div>
              <div className="text-center mb-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Mail size={24} aria-hidden />
                </div>
                <h1 className="text-h2 text-slate-900">Verify Your Email</h1>
                <p className="mt-2 text-body-sm text-slate-600">
                  We sent a 6-digit confirmation code to{" "}
                  <strong className="text-slate-900 font-semibold">{email}</strong>.
                  Enter the code below to complete your registration.
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4" noValidate>
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
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "")
                      setOtpCode(val)
                      setOtpError("")
                    }}
                    placeholder="000000"
                    className={cn(
                      "w-full rounded-card border bg-white px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100",
                      otpError ? "border-red-500" : "border-slate-200"
                    )}
                    aria-label="6-digit verification code"
                  />
                  {otpError ? (
                    <p className="mt-1.5 text-center text-xs font-semibold text-red-600">
                      {otpError}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" size="lg" fullWidth loading={otpLoading}>
                  Verify & Complete Registration
                </Button>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setStep("form"); setOtpError(""); setOtpCode("") }}
                    className="font-medium text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    ← Edit Details
                  </button>

                  <button
                    type="button"
                    disabled={otpCountdown > 0}
                    onClick={handleResendOtp}
                    className={cn(
                      "font-semibold transition-colors",
                      otpCountdown > 0
                        ? "text-slate-400 cursor-not-allowed"
                        : "text-primary-700 hover:text-primary-800 underline"
                    )}
                  >
                    {otpCountdown > 0 ? `Resend code in ${otpCountdown}s` : "Resend Code"}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Step 1: Account Details Form */
            <>
              <h1 className="text-h2 text-slate-900">{s["auth.signup.title"]}</h1>
              <p className="mt-1 text-body-sm text-slate-500">{s["auth.signup.subtitle"]}</p>

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
                <Tabs<AccountType>
                  tabs={[
                    { value: "student", label: s["auth.signup.studentTab"] },
                    { value: "organization", label: s["auth.signup.orgTab"] },
                  ]}
                  value={accountType}
                  onChange={setAccountType}
                />

                <Input
                  label="Name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError("") }}
                  placeholder={
                    accountType === "student" ? s["auth.signup.namePlaceholder.name"] : s["auth.signup.namePlaceholder.org"]
                  }
                  autoComplete="name"
                  error={nameError || undefined}
                />

                <Input
                  label="Email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                  placeholder={s["auth.signup.emailPlaceholder"]}
                  autoComplete="email"
                  error={emailError || undefined}
                />

                <div>
                  <Input
                    label="Create Password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    error={passwordError || undefined}
                  />
                  {!passwordError ? (
                    <p className="mt-1 text-[11px] text-slate-500 font-medium">Must be at least 8 characters long</p>
                  ) : null}
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError("") }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  error={confirmPasswordError || undefined}
                />

                <Input
                  label={s["auth.signup.inviteLabel"]}
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={s["auth.signup.invitePlaceholder"]}
                />
                <p className="-mt-2 text-xs text-slate-500">{s["auth.signup.inviteHint"]}</p>

                {accountType === "organization" ? (
                  <Select
                    label={s["auth.signup.orgTypeLabel"]}
                    options={ORGANIZATION_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                    placeholder={s["auth.signup.orgTypePlaceholder"]}
                    value={organizationType}
                    onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                    required
                  />
                ) : null}

                {/* Statutory Terms & Privacy Policy Acceptance */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => {
                        setAcceptedTerms(e.target.checked)
                        if (e.target.checked) setTermsError("")
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      aria-invalid={Boolean(termsError)}
                    />
                    <span className="text-xs text-slate-600 leading-snug">
                      I have read and agree to Krantind&apos;s{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="font-semibold text-primary-700 underline hover:text-primary-800"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="font-semibold text-primary-700 underline hover:text-primary-800"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </label>
                  {termsError ? (
                    <p className="text-[11px] font-semibold text-red-600 pl-6.5 animate-fade-in">
                      {termsError}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" size="lg" fullWidth loading={loading}>
                  {accountType === "organization" ? s["auth.signup.orgButton"] : s["auth.signup.studentButton"]}
                </Button>
              </form>

              <p className="mt-5 text-center text-body-sm text-slate-500">
                {s["auth.signup.hasAccount"]}{" "}
                <Link href="/login" className="font-semibold text-primary-700 hover:underline">
                  {s["auth.signup.loginLink"]}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}