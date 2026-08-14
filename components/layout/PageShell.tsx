// PageShell composes the logged-in layout: fixed desktop sidebar on the left,
// bottom tab bar on mobile, and the scrollable content area in between.
// Only used on post-login pages (guest pages have no Navbar).
import type { ReactNode } from "react"
import { useMemo } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { Navbar } from "./Navbar"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { FollowButton } from "@/components/feature/FollowButton"
import { Avatar } from "@/components/ui"
import s from "@/lib/strings"
import { compactNumber } from "@/lib/utils"

interface PageShellProps {
  children: ReactNode
}

export function PageShell({ children }: PageShellProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const posts = usePostStore((s) => s.posts)
  const follows = usePostStore((s) => s.follows)
  const users = useUserStore((s) => s.users)

  // Top 3 posts by support
  const trending = useMemo(
    () => [...posts].sort((a, b) => b.supportCount - a.supportCount).slice(0, 3),
    [posts]
  )

  // Orgs the user doesn't follow yet
  const suggestedOrgs = useMemo(
    () => Object.values(users).filter(
      (u) =>
        u.accountType === "organization" &&
        u.id !== currentUser?.id &&
        !follows.some((f) => f.followerId === currentUser?.id && f.followingId === u.id),
    ).slice(0, 3),
    [users, currentUser?.id, follows]
  )
  return (
    <div className="min-h-dvh w-full bg-slate-50">
      <Navbar />

      {/*
        3-Column Layout structure:
        Left Sidebar (Navbar, ~275px wide)
        Center Content (Feed, max ~600px wide for optimal reading)
        Right Sidebar (Trends/Search, ~350px wide)
      */}
      <div className="mx-auto flex w-full max-w-[1200px] justify-center lg:justify-start">
        {/* Main Content Area */}
        <main className="w-full min-w-0 max-w-[600px] border-x border-slate-200 bg-white min-h-dvh lg:ml-[275px]">
          <div className="pb-24 sm:pb-10">
            {children}
          </div>
        </main>

        {/* Right Sidebar (Hidden on mobile and small tablets) */}
        <aside className="hidden w-[350px] lg:block xl:pl-8 py-4">
          <div className="sticky top-4 space-y-6 pl-4 pr-4">
            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400 group-focus-within:text-primary-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search Krantind..."
                className="w-full rounded-full border-none bg-slate-100 py-3.5 pl-11 pr-4 text-[15px] outline-none transition-app focus:bg-white focus:ring-1 focus:ring-primary-500 shadow-sm"
              />
            </div>

            {/* Trending Widget */}
            {trending.length > 0 && (
              <div className="rounded-2xl bg-slate-50 px-5 py-4 border border-slate-100">
                <h2 className="text-[19px] font-bold text-slate-900 mb-4">{s["feed.trending"]}</h2>
                <div className="space-y-4">
                  {trending.map((p) => {
                    const author = users[p.authorId]
                    return (
                      <Link href={`/post/${p.id}`} key={p.id} className="block group">
                        <p className="text-[13px] text-slate-500 group-hover:underline">
                          {author?.name ?? "?"} · {author?.state ?? "India"}
                        </p>
                        <p className="text-[15px] font-bold text-slate-900 mt-0.5 line-clamp-2">
                          {p.text}
                        </p>
                        <p className="text-[13px] text-slate-500 mt-0.5">
                          {compactNumber(p.supportCount)} supports
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Suggested Orgs Widget */}
            {suggestedOrgs.length > 0 && (
              <div className="rounded-2xl bg-slate-50 px-5 py-4 border border-slate-100">
                <h2 className="text-[19px] font-bold text-slate-900 mb-4">{s["feed.suggestedOrgs"]}</h2>
                <div className="flex flex-col gap-4">
                  {suggestedOrgs.map((org) => (
                    <div key={org.id} className="flex items-center gap-3">
                      <Avatar name={org.name} src={org.avatarUrl} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">{org.name}</p>
                        <p className="text-[13px] text-slate-500">{s["feed.followers"](org.followerCount)}</p>
                      </div>
                      <FollowButton
                        followerId={currentUser?.id ?? ""}
                        followingId={org.id}
                        className="shrink-0 scale-90 origin-right"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}