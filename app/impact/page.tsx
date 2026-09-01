"use client"

// Campus Impact & Resolution Leaderboard
// Highlights real-world resolved student grievances, active campus stats, and victory stories across India.
import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Trophy,
  CheckCircle2,
  Users,
  Building2,
  TrendingUp,
  ArrowLeft,
  Plus,
  Sparkles,
  Award,
  ShieldCheck,
} from "lucide-react"
import { Card, Button } from "@/components/ui"
import { PostCard } from "@/components/feature/PostCard"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserStore } from "@/lib/store/useUserStore"

export default function ImpactPage() {
  const posts = usePostStore((s) => s.posts)
  const users = useUserStore((s) => s.users)
  const [filterTab, setFilterTab] = useState<"all" | "recent">("all")

  // Filter resolved issues
  const resolvedPosts = useMemo(
    () => posts.filter((p) => p.isResolved),
    [posts],
  )

  // Total student support signatures
  const totalSupports = useMemo(
    () => posts.reduce((acc, p) => acc + (p.supportCount || 0), 0),
    [posts],
  )

  // Calculate college engagement stats from real posts only
  const collegeStats = useMemo(() => {
    const map = new Map<
      string,
      { college: string; totalPosts: number; resolvedPosts: number; supports: number }
    >()

    posts.forEach((p) => {
      const author = users[p.authorId]
      const collegeName = author?.collegeName?.trim()
      if (!collegeName) return

      const existing = map.get(collegeName) || {
        college: collegeName,
        totalPosts: 0,
        resolvedPosts: 0,
        supports: 0,
      }

      existing.totalPosts += 1
      if (p.isResolved) existing.resolvedPosts += 1
      existing.supports += p.supportCount || 0

      map.set(collegeName, existing)
    })

    return Array.from(map.values()).sort(
      (a, b) => b.resolvedPosts * 10 + b.supports - (a.resolvedPosts * 10 + a.supports),
    )
  }, [posts, users])

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-2">
      {/* Top Breadcrumb & Live Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <Link
          href="/feed"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-primary-700"
        >
          <ArrowLeft size={15} />
          <span>Back to Feed</span>
        </Link>
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-xs font-bold text-emerald-800">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Campus Metrics
        </span>
      </div>

      {/* High-Contrast Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700">
              <Trophy size={16} className="text-amber-500" />
              <span>Campus Impact & Accountability</span>
            </div>
            <h1 className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              Where Student Voices Turn Into Campus Solutions
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Track issues resolved by student councils, hostel committees, and college administrations across India.
            </p>
          </div>

          <Link href="/post/create" className="shrink-0">
            <Button size="md" className="shadow-xs font-bold flex items-center gap-1.5">
              <Plus size={16} strokeWidth={2.5} />
              <span>Voice a Grievance</span>
            </Button>
          </Link>
        </div>

        {/* 4 High-Contrast Stat Cards */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {/* Stat 1 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={16} />
              </span>
              <span className="text-xs font-semibold text-slate-600">Resolved</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {resolvedPosts.length}
            </p>
            <p className="text-[11px] font-medium text-emerald-700 mt-0.5">Campus Victories</p>
          </div>

          {/* Stat 2 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                <TrendingUp size={16} />
              </span>
              <span className="text-xs font-semibold text-slate-600">Grievances</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {posts.length}
            </p>
            <p className="text-[11px] font-medium text-primary-700 mt-0.5">Issues Voiced</p>
          </div>

          {/* Stat 3 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Users size={16} />
              </span>
              <span className="text-xs font-semibold text-slate-600">Supports</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {totalSupports}
            </p>
            <p className="text-[11px] font-medium text-blue-700 mt-0.5">Student Signatures</p>
          </div>

          {/* Stat 4 */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:bg-white hover:shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <Building2 size={16} />
              </span>
              <span className="text-xs font-semibold text-slate-600">Campuses</span>
            </div>
            <p className="mt-2 font-serif text-2xl font-bold text-slate-900 sm:text-3xl">
              {collegeStats.length}
            </p>
            <p className="text-[11px] font-medium text-amber-700 mt-0.5">Active Colleges</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Columns: Resolved Issues Wall */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-900">Resolved Campus Issues</h2>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {resolvedPosts.length} {resolvedPosts.length === 1 ? "victory" : "victories"}
            </span>
          </div>

          {resolvedPosts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center bg-white border border-slate-200 shadow-xs">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Resolved Issues Yet</h3>
              <p className="mt-1 max-w-md text-xs text-slate-500 leading-relaxed">
                When campus authorities or student unions fix an issue, the creator or council can mark it as <strong>Resolved</strong> to showcase the victory here.
              </p>
              <Link href="/post/create" className="mt-5">
                <Button size="sm" variant="outline">
                  Voice an Issue in Your College
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="flex flex-col gap-4">
              {resolvedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Column: Campus Leaderboard */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Campus Leaderboard</h2>
          </div>

          <Card className="flex flex-col divide-y divide-slate-100 p-0 overflow-hidden bg-white border border-slate-200 shadow-xs">
            {collegeStats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                <div className="flex justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 font-bold text-sm">
                    RANK
                  </span>
                </div>
                <p className="font-bold text-slate-800 text-sm">No Campus Rankings Yet</p>
                <p className="text-slate-500 leading-relaxed">
                  Verify your college email in Settings or raise a grievance to get your campus ranked here.
                </p>
              </div>
            ) : (
              collegeStats.slice(0, 8).map((stat, idx) => (
                <div
                  key={stat.college}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                          : idx === 1
                          ? "bg-slate-200 text-slate-700"
                          : idx === 2
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{stat.college}</p>
                      <p className="text-[11px] text-slate-500">
                        {stat.totalPosts} {stat.totalPosts === 1 ? "issue" : "issues"} &bull; {stat.supports} supports
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {stat.resolvedPosts} resolved
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="p-3.5 bg-slate-50/80 text-center border-t border-slate-100">
              <Link
                href="/settings"
                className="text-xs font-bold text-primary-700 hover:text-primary-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Verify your College Email</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
