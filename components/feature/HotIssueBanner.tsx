"use client"

// HotIssueBanner — Renders a prominent, animated banner at the top of the feed
// when the heatmap algorithm detects a breaking campus issue (velocity surge).
// Shows the topic, how many students are discussing, college spread, and a
// clickable CTA to view all related posts.

import { useState } from "react"
import Link from "next/link"
import { Flame, TrendingUp, Zap, ChevronRight, X, Users, Building2 } from "lucide-react"
import type { HotIssue } from "@/lib/heatmap"
import { cn } from "@/lib/utils"

interface HotIssueBannerProps {
  issues: HotIssue[]
  className?: string
}

const tierConfig = {
  breaking: {
    icon: Zap,
    label: "🔥 Breaking Campus Issue",
    bg: "bg-gradient-to-r from-red-600 via-orange-500 to-amber-500",
    text: "text-white",
    badge: "bg-white/20 text-white",
    border: "ring-2 ring-red-300/40",
    animate: "animate-pulse-slow",
  },
  hot: {
    icon: Flame,
    label: "🔥 Hot Issue",
    bg: "bg-gradient-to-r from-orange-500 to-amber-400",
    text: "text-white",
    badge: "bg-white/20 text-white",
    border: "ring-1 ring-orange-300/40",
    animate: "",
  },
  rising: {
    icon: TrendingUp,
    label: "📈 Rising Issue",
    bg: "bg-gradient-to-r from-primary-600 to-primary-400",
    text: "text-white",
    badge: "bg-white/20 text-white",
    border: "ring-1 ring-primary-300/30",
    animate: "",
  },
}

export function HotIssueBanner({ issues, className }: HotIssueBannerProps) {
  const [dismissedTopics, setDismissedTopics] = useState<Set<string>>(new Set())

  const visibleIssues = issues.filter((i) => !dismissedTopics.has(i.topic))
  if (visibleIssues.length === 0) return null

  const handleDismiss = (topic: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissedTopics((prev) => new Set([...prev, topic]))
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {visibleIssues.map((issue) => {
        const config = tierConfig[issue.tier]
        const Icon = config.icon

        return (
          <Link
            key={issue.topic}
            href={`/tag/${encodeURIComponent(issue.topic)}`}
            className={cn(
              "group relative flex flex-col gap-2 rounded-2xl p-4 shadow-lg transition-all hover:shadow-xl hover:scale-[1.01]",
              config.bg,
              config.text,
              config.border,
              config.animate,
            )}
          >
            {/* Dismiss button */}
            <button
              onClick={(e) => handleDismiss(issue.topic, e)}
              className="absolute right-3 top-3 rounded-full p-1 opacity-60 hover:bg-white/20 hover:opacity-100 transition-all"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>

            {/* Tier label + topic */}
            <div className="flex items-center gap-2">
              <Icon size={18} className="shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider opacity-90">
                {config.label}
              </span>
            </div>

            {/* Main headline */}
            <h3 className="text-base font-bold leading-snug pr-6">
              {issue.displayLabel}{" "}
              <span className="font-normal opacity-90">
                — {issue.recentPostCount} students discussing
                {issue.collegeCount >= 2
                  ? ` across ${issue.collegeCount} colleges`
                  : issue.collegeNames.length === 1
                    ? ` at ${issue.collegeNames[0]}`
                    : ""}
              </span>
            </h3>

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-3 text-xs opacity-90">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", config.badge)}>
                <Users size={11} />
                {issue.recentPostCount} posts in {48}h
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", config.badge)}>
                <TrendingUp size={11} />
                {issue.velocityScore}× velocity
              </span>
              {issue.collegeCount >= 2 && (
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", config.badge)}>
                  <Building2 size={11} />
                  {issue.collegeNames.slice(0, 3).join(", ")}
                  {issue.collegeCount > 3 ? ` +${issue.collegeCount - 3}` : ""}
                </span>
              )}
              {issue.totalSupports > 0 && (
                <span className="opacity-80">
                  {issue.totalSupports} supports · {issue.totalComments} comments
                </span>
              )}
            </div>

            {/* CTA */}
            <div className="flex items-center gap-1 text-xs font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
              <span>View all posts</span>
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
