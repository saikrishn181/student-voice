"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy, Plus } from "lucide-react"
import { Navbar } from "./Navbar"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  const pathname = usePathname()
  const isChatThread = pathname.startsWith("/messages/") && pathname !== "/messages"
  const isDedicatedSubPage =
    pathname.startsWith("/settings") ||
    pathname.startsWith("/accounts") ||
    pathname.startsWith("/post/create") ||
    pathname.startsWith("/post/") ||
    isChatThread

  return (
    <div className="min-h-dvh w-full bg-paper">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-card focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-card"
      >
        {s["a11y.skipToContent"]}
      </a>
      <Navbar />

      {/* Mobile Top Header with Plus (Post) on Top Left, krantind in Middle, and Impact on Top Right (< 1024px) */}
      {!isDedicatedSubPage ? (
        <header className="sticky top-0 z-20 flex w-full items-center justify-between bg-paper pt-5 pb-2.5 px-4 sm:px-6 lg:hidden">
          <Link
            href="/post/create"
            aria-label="Create Post"
            className="flex items-center gap-1.5 rounded-pill bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-xs hover:bg-primary-700 active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Post</span>
          </Link>

          {/* Platform Name in Middle */}
          <Link
            href="/feed"
            className="flex items-center justify-center transition-opacity hover:opacity-90 translate-y-1.5 sm:translate-y-2"
          >
            <span className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 lowercase">
              krantind
            </span>
          </Link>

          <Link
            href="/impact"
            className="flex items-center gap-1.5 rounded-pill border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors"
          >
            <Trophy size={16} className="text-amber-600" />
            <span>Impact</span>
          </Link>
        </header>
      ) : null}

      {/* Content: leaves room for the fixed sidebar on desktop and the bottom bar on mobile */}
      <main id="main-content" className="lg:pl-64">
        {/* Desktop Top Bar with Platform Name in Middle and Impact Link on Right (>= 1024px) */}
        {!isDedicatedSubPage ? (
          <div className="hidden lg:grid grid-cols-3 w-full items-center px-8 pt-6 pb-2">
            <div />
            <div className="flex justify-center translate-y-1.5">
              <Link
                href="/feed"
                className="flex items-center justify-center transition-opacity hover:opacity-90"
              >
                <span className="font-serif text-3xl xl:text-4xl font-bold tracking-tight text-slate-900 lowercase">
                  krantind
                </span>
              </Link>
            </div>
            <div className="flex justify-end">
              <Link
                href="/impact"
                className="flex items-center gap-2 rounded-pill border border-amber-300 bg-amber-50/90 px-4 py-2 text-sm font-bold text-amber-800 shadow-xs hover:bg-amber-100 transition-colors"
              >
                <Trophy size={17} className="text-amber-600" />
                <span>Campus Impact & Leaderboard</span>
              </Link>
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "mx-auto w-full",
            isChatThread
              ? "p-0 h-dvh flex flex-col max-w-3xl"
              : "max-w-content px-4 pb-28 pt-3 sm:px-6 lg:px-8 lg:pb-12"
          )}
        >
          {children}
          {!isChatThread ? (
            <footer className="mt-16 border-t border-[#E8E1D6] pt-6 text-center">
              <p className="text-xs font-medium text-slate-400">{s["footer.copyright"]}</p>
            </footer>
          ) : null}
        </div>
      </main>
    </div>
  )
}

