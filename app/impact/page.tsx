"use client"

// Campus Impact & Resolution Leaderboard
// Highlights resolved student grievances, active campus stats, and victory stories across India.
import { useMemo } from "react"
import Link from "next/link"
import {
  Trophy,
  CheckCircle2,
  Users,
  Building2,
  Sparkles,
  TrendingUp,
  ArrowRight,
  Flame,
} from "lucide-react"
import { Card, Button } from "@/components/ui"
import { PostCard } from "@/components/feature/PostCard"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserStore } from "@/lib/store/useUserStore"

export default function ImpactPage() {
  const posts = usePostStore((s) => s.posts)
  const users = useUserStore((s) => s.users)

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

  // Calculate college engagement stats from real posts
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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 py-4">
      {/* Hero Header */}
      <div className="rounded-card border border-primary-200 bg-linear-to-r from-primary-900 via-primary-800 to-slate-900 p-6 text-white shadow-lift sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-300">
              <Trophy size={16} className="text-amber-400" />
              <span>Real-World Campus Impact</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold font-serif sm:text-3xl text-white">
              Where Student Voices Turn Into Campus Solutions
            </h1>
            <p className="mt-2 text-sm text-primary-100/90 max-w-xl">
              Track issues resolved by student unions, hostel committees, and college administrations across India.
            </p>
          </div>

          {/* Top Right Action Button */}
          <Link href="/post/create" className="shrink-0">
            <Button size="md" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold border-0 shadow-lift">
              + Voice a Grievance
            </Button>
          </Link>
        </div>

        {/* Top 4 Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-card bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-primary-200 text-xs">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Resolved Issues</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white font-serif">
              {resolvedPosts.length}
            </p>
          </div>

          <div className="rounded-card bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-primary-200 text-xs">
              <TrendingUp size={14} className="text-accent-400" />
              <span>Total Grievances</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white font-serif">
              {posts.length}
            </p>
          </div>

          <div className="rounded-card bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-primary-200 text-xs">
              <Users size={14} className="text-blue-400" />
              <span>Student Supports</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white font-serif">
              {totalSupports}
            </p>
          </div>

          <div className="rounded-card bg-white/10 p-3.5 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-primary-200 text-xs">
              <Building2 size={14} className="text-purple-400" />
              <span>Active Campuses</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-white font-serif">
              {collegeStats.length}
            </p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Resolved Issues Wall */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <h2 className="text-lg font-bold text-slate-900">Resolved Campus Issues</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {resolvedPosts.length} victories
            </span>
          </div>

          {resolvedPosts.length === 0 ? (
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <CheckCircle2 size={40} className="text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No resolved issues yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                When campus grievances are fixed by student unions or administrations, they appear here as victory stories.
              </p>
              <Link href="/post/create" className="mt-4">
                <Button size="sm">Voice a Campus Issue</Button>
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

        {/* Right 1 Col: Top Campuses Leaderboard */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Campus Leaderboard</h2>
          </div>

          <Card className="flex flex-col divide-y divide-slate-100 p-0 overflow-hidden">
            {collegeStats.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">No campus rankings yet</p>
                <p className="text-slate-400">
                  Verify your college email in Settings or post a grievance to rank your campus here.
                </p>
              </div>
            ) : (
              collegeStats.slice(0, 8).map((stat, idx) => (
                <div key={stat.college} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800"
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
                      <p className="truncate text-xs font-bold text-slate-900">
                        {stat.college}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {stat.totalPosts} issues raised
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="rounded-pill bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      {stat.resolvedPosts} resolved
                    </span>
                  </div>
                </div>
              ))
            )}
            <div className="p-3 bg-slate-50/70 text-center border-t border-slate-100">
              <Link href="/settings" className="text-xs font-semibold text-primary-700 hover:underline">
                🎓 Verify your College Email to represent your campus &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
