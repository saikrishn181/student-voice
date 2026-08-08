"use client"

// Client routing shell that:
//  - Restores the Supabase session on mount (bootstrap).
//  - Renders guest pages (Landing, Login, Signup) WITHOUT the Navbar.
//  - Redirects unauthenticated users away from protected pages -> /login.
//  - Loads feed/notifications data into the stores once a user is signed in.
//  - Renders the Navbar (via PageShell) only for authenticated in-app pages.
import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useNotificationStore } from "@/lib/store/useNotificationStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { PageShell } from "./PageShell"
import { Spinner } from "@/components/ui/Spinner"

const PUBLIC_ROUTES = ["/", "/forgot-password", "/login", "/signup"]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const bootstrapping = useAuthStore((s) => s.bootstrapping)
  const currentUser = useAuthStore((s) => s.currentUser)

  // Restore the session once on mount.
  useEffect(() => {
    useAuthStore.getState().bootstrap()
  }, [])

  // Once signed in, hydrate the post + notification + profiles caches.
  useEffect(() => {
    if (!isLoggedIn) return
    useUserStore.getState().loadAll()
    usePostStore.getState().loadAll(currentUser?.id)
    useNotificationStore.getState().load(currentUser?.id ?? "")
  }, [isLoggedIn, currentUser?.id])

  const isPublic = PUBLIC_ROUTES.includes(pathname)
  // Onboarding pages are authenticated but shown WITHOUT the app shell (no Navbar),
  // per the spec — Landing, Login, Signup, Region Selection have no Navbar.
  const isBareAuthenticated = pathname.startsWith("/onboarding")

  // Handle guest route protection: redirect logged-out users away from
  // protected pages to /login.
  useEffect(() => {
    if (!bootstrapping && !isPublic && !isLoggedIn) {
      router.replace("/login")
    }
  }, [bootstrapping, isPublic, isLoggedIn, router])

  // While restoring the session, avoid flash of the login redirect.
  if (bootstrapping) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50">
        <Spinner size={28} />
      </div>
    )
  }

  // Landing / Login / Signup have no Navbar.
  if (isPublic) return <>{children}</>

  // Awaiting a redirect for logged-out users on protected pages.
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50">
        <Spinner size={28} />
      </div>
    )
  }

  // Authenticated on-boarding page: no Navbar, but still guest-protected.
  if (isBareAuthenticated) return <>{children}</>

  // Authenticated in-app page: wrap in the post-login shell (Navbar).
  return <PageShell>{children}</PageShell>
}