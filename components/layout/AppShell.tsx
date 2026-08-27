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
import { BannedUserScreen } from "@/components/feature"
import { checkUserBanStatus } from "@/lib/moderation"
import { Spinner } from "@/components/ui/Spinner"
import { validateEnv } from "@/lib/env"
import s from "@/lib/strings"

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/terms",
  "/privacy",
  "/grievance",
  "/guidelines",
  "/impact",
  "/forgot-password",
  "/reset-password",
  "/login",
  "/signup",
  "/auth/callback",
]

// Slim copyright pill shown at the bottom of every page without its own
// footer (the landing page has its own full footer).
function CopyrightFooter() {
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-2 z-10 flex justify-center lg:bottom-4">
      <p className="rounded-pill bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-card backdrop-blur">
        {s["footer.copyright"]}
      </p>
    </footer>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const bootstrapping = useAuthStore((s) => s.bootstrapping)
  const currentUser = useAuthStore((s) => s.currentUser)

  // Restore the session once on mount.
  useEffect(() => {
    validateEnv()
    useAuthStore.getState().bootstrap()
  }, [])

  // Once signed in, hydrate the post + notification + profiles caches.
  useEffect(() => {
    if (!isLoggedIn) return
    useUserStore.getState().loadAll()
    usePostStore.getState().loadAll(currentUser?.id)
    useNotificationStore.getState().load(currentUser?.id ?? "")
    useNotificationStore.getState().startRealtime(currentUser?.id ?? "")
    return () => {
      useNotificationStore.getState().stopRealtime()
    }
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
      <div className="flex min-h-dvh w-full items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  // Landing / Login / Signup have no Navbar.
  if (isPublic) {
    return (
      <>
        {children}
        {/* Landing has its own footer; the auth pages get the slim pill. */}
        {pathname !== "/" ? <CopyrightFooter /> : null}
      </>
    )
  }

  // Awaiting a redirect for logged-out users on protected pages.
  if (!isLoggedIn) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center">
        <Spinner size={28} />
      </div>
    )
  }

  // Banned user suspension gate: display the suspension screen if account is banned.
  const banStatus = checkUserBanStatus(currentUser)
  if (banStatus.isBanned) {
    return <BannedUserScreen user={currentUser!} />
  }

  // Authenticated on-boarding page: no Navbar, but still guest-protected.
  if (isBareAuthenticated) {
    return (
      <>
        {children}
        <CopyrightFooter />
      </>
    )
  }

  // Authenticated in-app page: wrap in the post-login shell (Navbar).
  return <PageShell>{children}</PageShell>
}