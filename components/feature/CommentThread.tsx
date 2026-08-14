"use client"

// Comment list for a post. Comments flagged isOrgHelp get a distinct
// highlighted background + a small "Offering Help" Badge. The author of a
// comment can edit or delete it (RLS also enforces ownership server-side).
import { useMemo, useState } from "react"
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react"
import { Badge, Avatar, Modal, Button, Textarea } from "@/components/ui"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { timeAgo } from "@/lib/utils"
import type { Comment } from "@/lib/types"
import { Skeleton } from "@/components/ui/Skeleton"
import { MAX_COMMENT_CHARS } from "@/constants"

interface CommentThreadProps {
  postId: string
  loading?: boolean
}

function CommentItem({ comment }: { comment: Comment }) {
  const author = useUserById(comment.authorId)
  const currentUserId = useAuthStore((s) => s.currentUser?.id)
  const updateComment = usePostStore((s) => s.updateComment)
  const deleteComment = usePostStore((s) => s.deleteComment)
  const showToast = useToastStore((s) => s.show)

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.text)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isMine = comment.authorId === currentUserId

  const handleSave = async () => {
    const next = draft.trim()
    if (!next || next === comment.text) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await updateComment(comment.postId, comment.id, next)
      showToast(s["comment.updateSuccess"], "success")
      setEditing(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteComment(comment.postId, comment.id)
      showToast(s["comment.deleteSuccess"], "success")
      setConfirmDelete(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setDeleting(false)
    }
  }

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

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={MAX_COMMENT_CHARS}
            aria-label={s["comment.editLabel"]}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(comment.text)
                setEditing(false)
              }}
            >
              <X size={16} aria-hidden /> {s["comment.cancel"]}
            </Button>
            <Button type="button" size="sm" loading={saving} onClick={handleSave}>
              <Check size={16} aria-hidden /> {s["comment.save"]}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 break-words text-body-sm text-slate-700">{comment.text}</p>
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</p>
        {isMine && !editing ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={s["comment.menuLabel"]}
              className="transition-app -mr-1 -mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              style={{ minHeight: 40, minWidth: 40 }}
            >
              <MoreHorizontal size={16} />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute bottom-full right-0 z-20 mb-1 w-36 overflow-hidden rounded-card border border-slate-200 bg-white shadow-modal">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setDraft(comment.text)
                      setEditing(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={14} className="text-slate-400" />
                    {s["comment.edit"]}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirmDelete(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    {s["comment.delete"]}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={s["comment.deleteTitle"]}>
        <div className="flex flex-col gap-5">
          <p className="text-body-sm text-slate-600">{s["comment.deleteDescription"]}</p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {s["post.deleteConfirm.cancel"]}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              {s["comment.delete"]}
            </Button>
          </div>
        </div>
      </Modal>
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