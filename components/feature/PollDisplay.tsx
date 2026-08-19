"use client"

// PollDisplay: renders a post's embedded poll (from post.poll_json) and manages
// voting. Vote counts + the current user's choice live in `poll_votes` and are
// fetched lazily here, so this works on any page without store plumbing.
import { useCallback, useEffect, useState } from "react"
import { BarChart3 } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { cn } from "@/lib/utils"
import s from "@/lib/strings"
import type { Poll } from "@/lib/types"

interface PollDisplayProps {
  postId: string
  poll: Poll
}

interface VoteRow {
  user_id: string
  option_index: number
}

export function PollDisplay({ postId, poll }: PollDisplayProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)

  const [counts, setCounts] = useState<number[]>([])
  const [myVote, setMyVote] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [voting, setVoting] = useState(false)

  const loadVotes = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase.from("poll_votes").select("user_id, option_index").eq("post_id", postId)
    const rows = (data ?? []) as VoteRow[]
    const next = poll.options.map((_, i) => rows.filter((r) => r.option_index === i).length)
    const mine = rows.find((r) => r.user_id === currentUser?.id)?.option_index ?? null
    setCounts(next)
    setMyVote(mine)
    setLoading(false)
  }, [postId, poll.options, currentUser?.id])

  useEffect(() => {
    void loadVotes()
  }, [loadVotes])

  const ended = poll.endsAt ? new Date(poll.endsAt).getTime() < Date.now() : false
  const total = counts.reduce((a, b) => a + b, 0)
  const showResults = myVote !== null || ended

  const endsIn = poll.endsAt
    ? (() => {
        const ms = new Date(poll.endsAt).getTime() - Date.now()
        const hours = Math.floor(ms / 3_600_000)
        if (hours < 1) return s["poll.closesMin"](Math.max(1, Math.floor(ms / 60_000)))
        if (hours < 24) return s["poll.closesHour"](hours)
        return s["poll.closesDay"](Math.floor(hours / 24))
      })()
    : null

  const handleVote = async (index: number) => {
    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }
    if (showResults || voting) return
    setVoting(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.from("poll_votes").insert({
      post_id: postId,
      user_id: currentUser.id,
      option_index: index,
    })
    setVoting(false)
    if (error) {
      if (error.message?.includes("duplicate")) {
        await loadVotes()
        return
      }
      showToast(s["poll.voteError"], "error")
      return
    }
    await loadVotes()
  }

  return (
    <div className="rounded-card border border-slate-200 bg-slate-50 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <BarChart3 size={15} className="text-primary-600" aria-hidden />
        {poll.question}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {poll.options.map((option, i) => {
          const count = counts[i] ?? 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <button
              key={`${option}-${i}`}
              type="button"
              disabled={showResults || voting}
              onClick={() => handleVote(i)}
              aria-pressed={myVote === i}
              className={cn(
                "relative overflow-hidden rounded-card border px-3 py-2.5 text-left text-sm font-medium transition-app",
                showResults
                  ? "border-slate-200 bg-white text-slate-700"
                  : "border-primary-200 bg-white text-slate-800 hover:border-primary-500 hover:bg-primary-50",
                myVote === i && "border-primary-600",
              )}
            >
              {showResults ? (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 bg-primary-100 transition-all duration-500",
                    myVote === i && "bg-primary-200",
                  )}
                  style={{ width: `${pct}%` }}
                />
              ) : null}
              <span className="relative flex items-center justify-between gap-2">
                <span>{option}</span>
                {showResults ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {count} · {pct}%
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {loading
          ? s["poll.loading"]
          : showResults
            ? s["poll.votes"](total)
            : endsIn
              ? s["poll.voteHint.ends"](endsIn)
              : s["poll.voteHint"]}
      </p>
    </div>
  )
}
