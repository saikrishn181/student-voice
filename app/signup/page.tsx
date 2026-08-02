"use client"

// Signup: toggle Student / Organization account type, mock-validate, optionally
// simulate "email already exists", then log in and go to Region Selection.
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Megaphone } from "lucide-react"
import { Button, Input, Select, Tabs } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { ORGANIZATION_TYPES, POST_SIGNUP_ROUTE } from "@/constants"
import type { AccountType, OrganizationType } from "@/lib/types"

export default function SignupPage() {
  const router = useRouter()
  const signup = useAuthStore((s) => s.signup)
  const showToast = useToastStore((s) => s.show)

  const [accountType, setAccountType] = useState<AccountType>("student")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [organizationType, setOrganizationType] = useState<OrganizationType | "">("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !email.trim() || !password) {
      showToast("Please fill in all required fields", "error")
      return
    }
    if (accountType === "organization" && !organizationType) {
      showToast("Please choose an organization type", "error")
      return
    }

    setLoading(true)

    // Fake "email already exists" error, 20% of the time — to exercise the
    // error-state UI. TODO: replace with a real Supabase signUp response check.
    if (Math.random() < 0.2) {
      setLoading(false)
      showToast("An account with this email already exists", "error")
      return
    }

    // TODO: replace with a real Supabase signUp(email, password, { data }).
    await new Promise((r) => setTimeout(r, 600))
    const resolvedOrgType: OrganizationType | undefined =
      accountType === "organization" && organizationType ? organizationType : undefined
    signup({
      name,
      email,
      accountType,
      organizationType: resolvedOrgType,
    })
    // After signup we ask for region, so send the user to Region Selection.
    router.push(POST_SIGNUP_ROUTE)
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} />
          </span>
          <span className="text-xl font-bold text-primary-700">StudentVoice</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <h1 className="text-h2 text-slate-900">Create your account</h1>
          <p className="mt-1 text-body-sm text-slate-500">Join your campus community today.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" noValidate>
            <Tabs<AccountType>
              tabs={[
                { value: "student", label: "Student" },
                { value: "organization", label: "Organization" },
              ]}
              value={accountType}
              onChange={setAccountType}
            />

            <Input
              label="Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                accountType === "student" ? "Your full name" : "Organization / Society name"
              }
              autoComplete="name"
            />

            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              autoComplete="new-password"
            />

            {accountType === "organization" ? (
              <Select
                label="Organization type"
                options={ORGANIZATION_TYPES.map((o) => ({ value: o.value, label: o.label }))}
                placeholder="Select organization type"
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value as OrganizationType)}
                required
              />
            ) : null}

            <Button type="submit" size="lg" fullWidth loading={loading}>
              {accountType === "organization" ? "Create Organization Account" : "Sign Up"}
            </Button>
          </form>

          <p className="mt-5 text-center text-body-sm text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary-700 hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}