"use client"

// Login: email + password, mock-validate empty fields, then log in via the
// auth store and redirect to /feed (a returning user already has a region set).
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Megaphone } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { LOGGED_IN_HOME } from "@/constants"

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const showToast = useToastStore((s) => s.show)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Mock validation: error toast if a required field is empty.
    if (!email.trim() || !password) {
      showToast("Please fill in both email and password", "error")
      return
    }
    setLoading(true)
    // TODO: replace with real Supabase sign-in (login returns a session).
    await new Promise((r) => setTimeout(r, 900))
    login(email.trim())
    showToast("Logged in successfully", "success")
    router.push(LOGGED_IN_HOME)
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} />
          </span>
          <span className="text-xl font-bold text-primary-700">StudentVoice</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <h1 className="text-h2 text-slate-900">Welcome back</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            Log in to continue supporting your peers.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
            <Input
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
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
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" size="lg" fullWidth loading={loading}>
              Log In
            </Button>
          </form>

          <p className="mt-5 text-center text-body-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary-700 hover:underline">
              Sign Up
            </Link>
          </p>

          <p className="mt-5 rounded-card bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
            Demo: use any email &amp; password, or try ananya@example.com
          </p>
        </div>
      </div>
    </div>
  )
}