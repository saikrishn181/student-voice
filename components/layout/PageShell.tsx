// PageShell composes the logged-in layout: fixed desktop sidebar on the left,
// bottom tab bar on mobile, and the scrollable content area in between.
// Only used on post-login pages (guest pages have no Navbar).
import type { ReactNode } from "react"
import { Navbar } from "./Navbar"
import s from "@/lib/strings"

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-dvh w-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-card focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-card"
      >
        {s["a11y.skipToContent"]}
      </a>
      <Navbar />
      {/* Content: leaves room for the fixed sidebar on desktop and the bottom bar on mobile */}
      <main id="main-content" className="lg:pl-64">
        <div className="mx-auto w-full max-w-content px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12">
          {children}
          <footer className="mt-16 border-t border-[#E8E1D6] pt-6 text-center">
            <p className="text-xs font-medium text-slate-400">{s["footer.copyright"]}</p>
          </footer>
        </div>
      </main>
    </div>
  )
}
