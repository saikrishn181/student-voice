"use client"

// RsvpButton: RSVP toggle for event posts. Count + my RSVP are fetched lazily
// from post_rsvps so the button works on every page without store plumbing.
import { useCallback, useEffect, useState } from "react"
import { CalendarCheck, CalendarX } from "lucide-react"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { cn } from "@/lib/utils"
import s from "@/lib/strings"

interface RsvpButtonProps {
  postId: string
  className?: string
}

interface RsvpRow {
  user_id: string
}

export function RsvpButton({ postId, className }: RsvpButtonProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)

  const [count, setCount] = useState<number | null>(null)
  const [mine, setMine] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase.from("post_rsvps").select("user_id").eq("post_id", postId)
    const rows = (data ?? []) as RsvpRow[]
    setCount(rows.length)
    setMine(rows.some((r) => r.user_id === currentUser?.id))
  }, [postId, currentUser?.id])

  useEffect(() => {
    void load()
  }, [load])

  const handleToggle = async () => {
    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }
    if (busy) return
    setBusy(true)
    const supabase = createSupabaseBrowserClient()
    if (mine) {
      const { error } = await supabase
        .from("post_rsvps")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", currentUser.id)
      if (error) showToast(s["rsvp.error"], "error")
    } else {
      const { error } = await supabase
        .from("post_rsvps")
        .insert({ post_id: postId, user_id: currentUser.id })
      if (error) {
        showToast(s["rsvp.error"], "error")
        setBusy(false)
        return
      }
    }
    setBusy(false)
    await load()
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={mine}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-pill px-3 py-1.5 text-sm font-semibold transition-app",
        mine
          ? "bg-amber-600 text-white hover:bg-amber-700"
          : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50",
        className,
      )}
    >
      {mine ? <CalendarX size={15} aria-hidden /> : <CalendarCheck size={15} aria-hidden />}
      {mine ? s["rsvp.going"] : s["rsvp.rsvp"]}
      {count !== null ? <span className="opacity-80">({count})</span> : null}
    </button>
  )
}
