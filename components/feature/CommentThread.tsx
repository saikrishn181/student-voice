"use client"

// Comment list for a post. Comments flagged isOrgHelp get a distinct
// highlighted background + a small "Offering Help" Badge.
import { Badge, Avatar } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { MOCK_USERS } from "@/lib/mockData"
import { timeAgo } from "@/lib/utils"
import { Skeleton } from "@/components/ui/Skeleton"

interface CommentThreadProps {
  postId: string
  loading?: boolean
}

export function CommentThread({ postId, loading = false }: CommentThreadProps) {
  const comments = usePostStore((s) => s.comments.filter((c) => c.postId === postId))

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <p className="text-center text-body-sm text-slate-400">No comments yet. Start the conversation.</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => {
        const author = MOCK_USERS.find((u) => u.id === comment.authorId)
        return (
          <div
            key={comment.id}
            className={
              comment.isOrgHelp
                ? "rounded-card border border-accent-200 bg-accent-50 p-3"
                : "rounded-card bg-slate-50 p-3"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Avatar name={author?.name ?? "Unknown"} src={author?.avatarUrl} size="sm" />
                <span className="text-sm font-semibold text-slate-800">
                  {author?.name ?? "Unknown"}
                </span>
              </div>
              {comment.isOrgHelp ? <Badge tone="accent">Offering Help</Badge> : null}
            </div>
            <p className="mt-2 text-body-sm text-slate-700">{comment.text}</p>
            <p className="mt-1 text-xs text-slate-400">{timeAgo(comment.createdAt)}</p>
          </div>
        )
      })}
    </div>
  )
}