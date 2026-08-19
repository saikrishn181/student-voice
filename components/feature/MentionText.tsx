"use client"

// Renders plain text with @mention tokens as clickable profile links. The
// username is resolved to a profile only when clicked (no static lookup
// needed, so it works for any rendering site without extra queries).
import { useRouter } from "next/navigation"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"

const MENTION_RE = /(@[A-Za-z0-9_]+)/g

export function MentionText({ text, className }: { text: string; className?: string }) {
  const router = useRouter()
  const showToast = useToastStore((s) => s.show)
  const parts = text.split(MENTION_RE)

  if (parts.length === 1) return <p className={className}>{text}</p>

  const goToMention = async (token: string) => {
    const username = token.slice(1)
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .maybeSingle()
    if (error || !data) {
      showToast(s["mention.notFound"], "error")
      return
    }
    router.push(`/profile/${data.id}`)
  }

  return (
    <p className={className}>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <button
            key={i}
            type="button"
            onClick={() => void goToMention(part)}
            className="font-semibold text-primary-700 hover:underline"
          >
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  )
}