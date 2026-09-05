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
import { cn, timeAgo } from "@/lib/utils"
import type { Comment } from "@/lib/types"
import { Skeleton } from "@/components/ui/Skeleton"
import { MAX_COMMENT_CHARS } from "@/constants"
import { MentionText } from "./MentionText"

interface CommentThreadProps {
  postId: string
  loading?: boolean
}

function CommentItem({ comment }: { comment: Comment }) {
  const author = useUserById(comment.authorId)
  const currentUser = useAuthStore((s) => s.currentUser)
  const updateComment = usePostStore((s) => s.updateComment)
  const deleteComment = usePostStore((s) => s.deleteComment)
  const showToast = useToastStore((s) => s.show)

  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.text)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isMine = comment.authorId === currentUser?.id
  const isAdmin = Boolean(currentUser?.isAdmin)
  const canModerate = isMine || isAdmin

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

  const isVerifiedOrg = author?.accountType === "organization" && author?.verificationStatus === "verified"
  const isOfficial = comment.isOfficialResponse || isVerifiedOrg
  const isAnonymousComment = Boolean(author?.isPrivate)

  return (
    <div
      className={cn(
        "rounded-card p-3 transition-colors",
        isOfficial
          ? "border border-blue-300 bg-blue-50/70 shadow-xs"
          : comment.isOrgHelp
          ? "border border-accent-200 bg-accent-50"
          : "bg-slate-50 border border-slate-100",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isAnonymousComment ? (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-100 text-purple-700 text-xs font-bold shadow-xs select-none border border-purple-200">
              A
            </div>
          ) : (
            <Avatar name={author?.name ?? s["post.unknownName"]} src={author?.avatarUrl} size="sm" />
          )}
          <span className="text-sm font-semibold text-slate-800">
            {isAnonymousComment ? (
              <span className="text-purple-950 select-none">
                Anonymous Student
                {currentUser?.id === comment.authorId ? " (You)" : ""}
              </span>
            ) : (
              author?.name ?? s["post.unknownName"]
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isOfficial ? (
            <span className="rounded-pill bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs flex items-center gap-1">
              Official Response
            </span>
          ) : comment.isOrgHelp ? (
            <Badge tone="accent">{s["comment.offeringHelp"]}</Badge>
          ) : null}
        </div>
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
        <MentionText text={comment.text} className="mt-2 break-words text-body-sm text-slate-700" />
      )}

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">{timeAgo(comment.createdAt)}</p>
        {canModerate && !editing ? (
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
                  {isMine ? (
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
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirmDelete(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    {isMine ? s["comment.delete"] : s["comment.deleteAsMod"]}
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
  const comments = useMemo(() => {
    const list = allComments.filter((c) => c.postId === postId)
    return [...list].sort((a, b) => {
      const aOfficial = a.isOfficialResponse || a.isOrgHelp ? 1 : 0
      const bOfficial = b.isOfficialResponse || b.isOrgHelp ? 1 : 0
      if (aOfficial !== bOfficial) return bOfficial - aOfficial
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  }, [allComments, postId])

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