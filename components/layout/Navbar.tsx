"use client"

// Responsive app navigation.
//  - < 1024px: bottom tab bar (Feed, Search, Create, Notifications, Profile)
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
      <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[11px] font-semibold leading-none text-white">
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link href="/feed" className="flex items-center gap-2 px-6 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} />
          </span>
          <span className="text-lg font-bold text-primary-700">{s["app.name"]}</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-app flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium",
                  active
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
                )}
              >
                <item.icon size={20} aria-hidden />
                {item.label}
                {item.href === "/notifications" ? renderUnread() : null}
              </Link>
            )
          })}
        </nav>

        {currentUser ? (
          <div className="border-t border-slate-200 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="transition-app flex w-full items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={20} aria-hidden />
              {s["nav.logout"]}
            </button>
          </div>
        ) : null}
      </aside>

      {/* Mobile bottom tab bar (< 1024px) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className={cn(
                "transition-app flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-primary-700" : "text-slate-500",
              )}
              style={{ minHeight: 48 }}
            >
              <span className="relative">
                <item.icon size={22} aria-hidden />
                {item.href === "/notifications" && unreadCount > 0 ? (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-semibold leading-none text-white">
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