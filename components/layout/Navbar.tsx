"use client"

// Responsive app navigation.
//  - < 1024px: floating pill bottom tab bar (Feed, Search, Create, Messages,
//    Notifications, Profile)
//  - >= 1024px: fixed left sidebar with icon + label
// Logout lives in the sidebar (desktop) and in the Profile menu on mobile.
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Home,
  Search,
  PlusSquare,
  Bell,
  User,
  LogOut,
  Megaphone,
  ShieldCheck,
  MessageSquare,
} from "lucide-react"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { useNotificationStore } from "@/lib/store/useNotificationStore"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import { Avatar } from "@/components/ui/Avatar"

const NAV_ITEMS = [
  { href: "/feed", label: s["nav.feed"], icon: Home },
  { href: "/search", label: s["nav.search"], icon: Search },
  { href: "/post/create", label: s["nav.create"], icon: PlusSquare },
  { href: "/messages", label: s["nav.messages"], icon: MessageSquare },
  { href: "/notifications", label: s["nav.notifications"], icon: Bell },
  { href: "/profile", label: s["nav.profile"], icon: User },
]

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)
  const notifications = useNotificationStore((s) => s.notifications)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const unreadCount = notifications.filter((n) => !n.read).length

  const renderUnread = () =>
    unreadCount > 0 ? (
      <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold leading-none text-white">
        {unreadCount > 9 ? "9+" : unreadCount}
      </span>
    ) : null

  const handleLogout = async () => {
    setProfileMenuOpen(false)
    await logout()
    showToast("Logged out successfully", "info")
    router.push("/")
  }

  return (
    <>
      {/* Desktop sidebar (>= 1024px) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[#E8E1D6] bg-[#FDFBF7] lg:flex">
        <Link href="/feed" className="flex items-center gap-2.5 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-b from-primary-600 to-primary-700 text-white shadow-card">
            <Megaphone size={20} />
          </span>
          <span className="font-display text-lg font-semibold text-primary-700">{s["app.name"]}</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-app group relative flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-[#F2ECE1] hover:text-slate-900",
                )}
              >
                {/* Active marker — small human touch instead of a flat fill */}
                {active ? (
                  <span className="absolute -left-3 h-6 w-1 rounded-full bg-accent-500" />
                ) : null}
                <item.icon size={20} aria-hidden className={cn(active ? "text-primary-600" : "text-slate-400 group-hover:text-slate-600")} />
                {item.label}
                {item.href === "/notifications" ? renderUnread() : null}
              </Link>
            )
          })}
          {currentUser?.isAdmin ? (
            <Link
              href="/admin/verifications"
              className={cn(
                "transition-app group relative flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium",
                pathname.startsWith("/admin")
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-[#F2ECE1] hover:text-slate-900",
              )}
            >
              {pathname.startsWith("/admin") ? (
                <span className="absolute -left-3 h-6 w-1 rounded-full bg-accent-500" />
              ) : null}
              <ShieldCheck size={20} aria-hidden className={cn(pathname.startsWith("/admin") ? "text-primary-600" : "text-slate-400")} />
              {s["nav.admin"]}
            </Link>
          ) : null}
        </nav>

        {currentUser ? (
          <div className="border-t border-[#E8E1D6] p-3">
            <Link
              href="/profile"
              className="transition-app flex w-full items-center gap-3 rounded-card px-3 py-2.5 hover:bg-[#F2ECE1]"
            >
              <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {currentUser.name}
                </span>
                <span className="block truncate text-xs text-slate-500">{currentUser.state}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="transition-app mt-1 flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={20} aria-hidden />
              {s["nav.logout"]}
            </button>
          </div>
        ) : null}
      </aside>

      {/* Mobile floating pill tab bar (< 1024px) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-4 bottom-4 z-30 flex justify-around rounded-full border border-[#E8E1D6] bg-white/90 shadow-lift backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "transition-app flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[10px] font-medium",
                active ? "text-primary-700" : "text-slate-500 hover:text-slate-700",
              )}
              style={{ minHeight: 52 }}
            >
              <span
                className={cn(
                  "relative transition-app flex h-8 w-11 items-center justify-center rounded-full",
                  active && "bg-primary-50",
                )}
              >
                <item.icon size={21} aria-hidden />
                {item.href === "/notifications" && unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-semibold leading-none text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
