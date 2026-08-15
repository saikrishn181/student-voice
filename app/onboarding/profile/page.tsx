"use client"

// One-time onboarding after a fresh sign-up / first Google sign-in.
//
// - Email sign-up users already chose their account type, so they only pick a
//   region (name is pre-filled).
// - Google users (no `account_type` in auth metadata) get the full form:
//   name (pre-filled from Google), region, student/organisation, organisation
//   type, private/public (students only) and an optional bio.
//
// Returning users never see this page: the auth callback redirects them
// straight to the feed once a region is set.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, MapPin } from "lucide-react"
import { Button, Input, Select, Tabs, Textarea } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { STATES, ORGANIZATION_TYPES, LOGGED_IN_HOME } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { AccountType, OrganizationType } from "@/lib/types"

export default function OnboardingProfilePage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const finishOnboarding = useAuthStore((s) => s.finishOnboarding)
  const showToast = useToastStore((s) => s.show)

  const [name, setName] = useState("")
  const [state, setState] = useState("")
  const [bio, setBio] = useState("")
  const [accountType, setAccountType] = useState<AccountType>("student")
  const [organizationType, setOrganizationType] = useState<OrganizationType | "">("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(true)
  const [isGoogleUser, setIsGoogleUser] = useState(false)
  const [password, setPassword] = useState("")
  const [nameError, setNameError] = useState<string | undefined>()
  const [passwordError, setPasswordError] = useState<string | undefined>()

  // Detect the sign-up origin once: Google accounts carry no `account_type`
  // in auth metadata, email sign-ups do.
  useEffect(() => {
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const isGoogle = !data.user?.user_metadata?.account_type
      setIsGoogleUser(isGoogle)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Prefill from the profile row (name comes from Google / sign-up form).
  useEffect(() => {
    if (!currentUser) return
    setName(currentUser.name)
    setState(currentUser.state ?? "")
    setBio(currentUser.bio ?? "")
    setAccountType(currentUser.accountType)
    setIsPrivate(currentUser.isPrivate ?? false)
    // Returning users already picked a region — never show onboarding again.
    if (currentUser.state) {
      router.replace(LOGGED_IN_HOME)
    }
  }, [currentUser, router])

  if (checking || !currentUser) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50">
        <div className="surface-card w-full max-w-md p-6 text-center">
          <p className="text-body-sm text-slate-500">{s["onboarding.profile.loading"]}</p>
        </div>
      </div>
    )
  }

  const canContinue = Boolean(name.trim()) && Boolean(state)
  const showAccountType = isGoogleUser

  const handleContinue = async () => {
    if (!name.trim()) {
      setNameError(s["validation.nameRequired"])
      return
    }
    setNameError(undefined)
    if (isGoogleUser && password.length < 6) {
      setPasswordError(s["validation.passwordTooShort"])
      return
    }
    setPasswordError(undefined)
    if (!state) {
      showToast(s["validation.regionRequired"], "error")
      return
    }
    if (accountType === "organization" && !organizationType) {
      showToast(s["validation.orgTypeRequired"], "error")
      return
    }

    setSaving(true)
    const result = await finishOnboarding({
      name: name.trim(),
      state,
      bio: bio.trim() || undefined,
      accountType,
      organizationType:
        accountType === "organization" && organizationType ? organizationType : undefined,
      isPrivate,
      password: isGoogleUser && password ? password.trim() : undefined,
    })
    setSaving(false)
    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
      return
    }
    router.push(LOGGED_IN_HOME)
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} aria-hidden />
          </span>
          <span className="text-xl font-bold text-primary-700">{s["app.name"]}</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-50 text-primary-700">
            <MapPin size={22} aria-hidden />
          </span>
          <h1 className="mt-3 text-h2 text-slate-900">{s["onboarding.profile.title"]}</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            {s["onboarding.profile.description"]}
          </p>

          <form
            className="mt-6 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              handleContinue()
            }}
          >
            {showAccountType ? (
              <>
                <Tabs<AccountType>
                  tabs={[
                    { value: "student", label: s["auth.signup.studentTab"] },
                    { value: "organization", label: s["auth.signup.orgTab"] },
                  ]}
                  value={accountType}
                  onChange={setAccountType}
                />
                <p className="-mt-3 text-xs text-slate-400">
                  {s["onboarding.profile.accountTypeHint"]}
                </p>
              </>
            ) : (
              <p className="text-body-sm text-slate-600">
                {s["onboarding.profile.accountTypeFixed"](
                  accountType === "organization"
                    ? s["post.authorType.org"]
                    : s["post.authorType.student"],
                )}
              </p>
            )}

            <Input
              label={s["settings.nameLabel"]}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(undefined)
              }}
              placeholder={s["settings.namePlaceholder"]}
              error={nameError}
              required
              autoComplete="name"
            />

            <Select
              label={s["onboarding.region.stateLabel"]}
              options={STATES.map((st) => ({ value: st, label: st }))}
              placeholder={s["onboarding.region.statePlaceholder"]}
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />

            {isGoogleUser ? (
              <div className="flex flex-col gap-1">
                <Input
                  label={s["onboarding.profile.passwordLabel"]}
                  type="password"
                  autoComplete="new-password"
                  placeholder={s["onboarding.profile.passwordPlaceholder"]}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError(undefined)
                  }}
                  error={passwordError}
                  required
                />
                <p className="text-xs text-slate-400">{s["onboarding.profile.passwordHint"]}</p>
              </div>
            ) : null}

            {showAccountType && accountType === "organization" ? (
              <Select
                label={s["auth.signup.orgTypeLabel"]}
                options={ORGANIZATION_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                placeholder={s["auth.signup.orgTypePlaceholder"]}
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                required
              />
            ) : null}

            {showAccountType && accountType === "student" ? (
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium text-slate-700">
                    {s["settings.privateLabel"]}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {s["settings.privateHint"]}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isPrivate}
                  aria-label={s["settings.privateLabel"]}
                  onClick={() => setIsPrivate((v) => !v)}
                  className={cn(
                    "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-app",
                    isPrivate ? "bg-primary-600" : "bg-slate-300",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-app",
                      isPrivate ? "left-[22px]" : "left-0.5",
                    )}
                  />
                </button>
              </label>
            ) : null}

            <Textarea
              label={s["settings.bioLabel"]}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={s["settings.bioPlaceholder"]}
              rows={3}
              maxLength={280}
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={saving}
              disabled={!canContinue}
            >
              {s["onboarding.profile.continue"]}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}