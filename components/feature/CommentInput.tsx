"use client"

// CommentInput: compose a comment on a post. Uses the base Input component.
// Disabled (with a tooltip) when the user isn't logged in. Posting is
// serialized (button disabled while in flight) and text is capped at
// MAX_COMMENT_CHARS to mirror the DB constraint.
import { useState } from "react"
import { Send } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { MAX_COMMENT_CHARS } from "@/constants"
import s from "@/lib/strings"

interface CommentInputProps {
  postId: string
  className?: string
}

export function CommentInput({ postId, className }: CommentInputProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const addComment = usePostStore((s) => s.addComment)
  const showToast = useToastStore((s) => s.show)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    if (!isLoggedIn || !currentUser) {
      showToast(s["validation.loginToComment"], "error")
      return
    }
    if (!text.trim()) {
      showToast(s["validation.commentEmpty"], "error")
      return
    }

    setSending(true)
    const isOrg = currentUser.accountType === "organization"
    try {
      await addComment(postId, currentUser.id, text.trim(), isOrg)
      setText("")
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_COMMENT_CHARS}
          placeholder={isLoggedIn ? s["comment.placeholder"] : s["comment.placeholderLoggedOut"]}
          disabled={!isLoggedIn}
          aria-label={s["comment.postButton"]}
          title={!isLoggedIn ? s["comment.placeholderLoggedOut"] : undefined}
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          size="md"
          disabled={!isLoggedIn || !text.trim() || sending}
          loading={sending}
          aria-label={s["comment.postButton"]}
          className="shrink-0"
        >
          <Send size={16} aria-hidden />
        </Button>
      </div>
    </form>
  )
}