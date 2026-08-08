"use client"

// Comment list for a post. Comments flagged isOrgHelp get a distinct
// highlighted background + a small "Offering Help" Badge.
import { useMemo } from "react"
import { Badge, Avatar } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { timeAgo } from "@/lib/utils"
import type { Comment } from "@/lib/types"
import { Skeleton } from "@/components/ui/Skeleton"

interface CommentThreadProps {
  postId: string
  loading?: boolean
}

function CommentItem({ comment }: { comment: Comment }) {
  const author = useUserById(comment.authorId)
  return (
    <div
      className={
        comment.isOrgHelp
          ? "rounded-card border border-accent-200 bg-accent-50 p-3"
          : "rounded-card bg-slate-50 p-3"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar name={author?.name ?? s["post.unknownName"]} src={author?.avatarUrl} size="sm" />
          <span className="text-sm font-semibold text-slate-800">
            {author?.name ?? s["post.unknownName"]}
          </span>
        </div>
        {comment.isOrgHelp ? <Badge tone="accent">{s["comment.offeringHelp"]}</Badge> : null}
      </div>
      <p className="mt-2 text-body-sm text-slate-700">{comment.text}</p>
      <p className="mt-1 text-xs text-slate-400">{timeAgo(comment.createdAt)}</p>
    </div>
  )
}

export function CommentThread({ postId, loading = false }: CommentThreadProps) {
  const allComments = usePostStore((s) => s.comments)
  const comments = useMemo(
    () => allComments.filter((c) => c.postId === postId),
    [allComments, postId],
  )

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
      <p className="text-center text-body-sm text-slate-400">{s["comment.empty"]}</p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} />
      ))}
    </div>
  )
}