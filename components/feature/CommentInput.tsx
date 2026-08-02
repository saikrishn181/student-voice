"use client"

// CommentInput: compose a comment on a post. Uses the base Input component.
// Disabled (with a tooltip) when the user isn't logged in.
import { useState } from "react"
import { Send } from "lucide-react"
import { Button, Input } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoggedIn || !currentUser) {
      showToast("You must be logged in to comment", "error")
      return
    }
    if (!text.trim()) {
      showToast("Please write something first", "error")
      return
    }

    // TODO: replace with real Supabase insert for `comments`.
    const isOrg = currentUser.accountType === "organization"
    addComment(postId, currentUser.id, text.trim(), isOrg)
    setText("")
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isLoggedIn ? "Write a comment…" : "Log in to comment"}
          disabled={!isLoggedIn}
          aria-label="Write a comment"
          title={!isLoggedIn ? "Log in to comment" : undefined}
          className="h-11 flex-1"
        />
        <Button
          type="submit"
          size="md"
          disabled={!isLoggedIn || !text.trim()}
          aria-label="Post comment"
          className="shrink-0"
        >
          <Send size={16} aria-hidden />
        </Button>
      </div>
    </form>
  )
}