"use client"

// PostCard: a full post on the feed and detail pages. Built on the base Card.
// Shows avatar, author name + VerifiedBadge (only for verified orgs),
// RegionTag, CategoryTag, timestamp, text, media, SupportButton, comment count,
// and a FollowButton (hidden for the viewer's own posts). Own posts show an
// actions menu (Edit / Delete) with a delete confirmation dialog.
import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Flag, ShieldOff, MessageCircle, MoreHorizontal, Pencil, Trash2, MessageSquare } from "lucide-react"
import { Card, Avatar, Modal, Button } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { cn, timeAgo } from "@/lib/utils"
import type { Post, ReportReason } from "@/lib/types"
import { MediaDisplay } from "./MediaDisplay"
import { VerifiedBadge, RegionTag } from "./Badges"
import { SupportButton } from "./SupportButton"
import { FollowButton } from "./FollowButton"

const REPORT_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "misinformation", label: "Misinformation" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
]

interface PostCardProps {
  post: Post
  // When true (detail page) we expand comment affordance; header still links out
  // to the post detail.
  showFollow?: boolean
  className?: string
}

export function PostCard({ post, showFollow = true, className }: PostCardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const currentUser = useAuthStore((s) => s.currentUser)
  const author = useUserById(post.authorId)
  const deletePost = usePostStore((s) => s.deletePost)
  const blockUser = usePostStore((s) => s.blockUser)
  const reportPost = usePostStore((s) => s.reportPost)
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const showToast = useToastStore((s) => s.show)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState<ReportReason | "">("")
  const [reportDetails, setReportDetails] = useState("")
  const [reporting, setReporting] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)

  const isOwnPost = currentUser?.id === post.authorId
  const isBlocked = Boolean(author?.id && blockedUserIds.includes(author.id))
  const isVerifiedOrg =
    author?.accountType === "organization" && author.verificationStatus === "verified"
  const follows = usePostStore((s) => s.follows)
  // Messaging a PRIVATE account is only allowed once they accept your follow
  // request. Public accounts (and admins) can always be messaged.
  const canMessage =
    !author ||
    isOwnPost ||
    currentUser?.isAdmin ||
    !author.isPrivate ||
    follows.some((f) => f.followerId === currentUser?.id && f.followingId === author.id)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePost(post.id)
      showToast(s["post.deleteSuccess"], "success")
      setConfirmOpen(false)
      // If we're viewing the post detail page, go back to the feed.
      if (pathname === `/post/${post.id}`) {
        router.push("/feed")
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setDeleting(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason) return
    setReporting(true)
    try {
      await reportPost(post.id, reportReason, reportDetails)
      showToast(s["report.submitted"], "success")
      setReportOpen(false)
      setReportReason("")
      setReportDetails("")
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setReporting(false)
    }
  }

  const handleBlock = async () => {
    if (!author) return
    setBlocking(true)
    try {
      await blockUser(author.id)
      showToast(s["block.userBlocked"], "success")
      setBlockOpen(false)
      if (pathname === `/post/${post.id}`) {
        router.push("/feed")
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setBlocking(false)
    }
  }

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <RegionTag state={post.state} />
      {post.hashtags.length > 0 &&
        post.hashtags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
          >
            #{tag}
          </span>
        ))}
      <span className="text-body-sm text-slate-400">·</span>
      <span className="text-body-sm text-slate-400" title={new Date(post.createdAt).toLocaleString()}>
        {timeAgo(post.createdAt)}
      </span>
    </div>
  )

  // Blocked-author posts are removed from the store; this is a belt-and-braces
  // guard so a stale render can never leak content.
  if (isBlocked) return null

  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/profile/${post.authorId}`} aria-label={s["post.viewProfile"]}>
            <Avatar name={author?.name ?? s["post.unknownName"]} src={author?.avatarUrl} size="sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/profile/${post.authorId}`}
                className="truncate text-sm font-semibold text-slate-900 hover:underline"
              >
                {author?.name ?? s["post.unknownName"]}
              </Link>
              {isVerifiedOrg ? <VerifiedBadge /> : null}
            </div>
            <div className="mt-0.5 text-body-sm text-slate-500">
              {author?.accountType === "organization" ? s["post.authorType.org"] : s["post.authorType.student"]} ·{" "}
              {timeAgo(post.createdAt)}
            </div>
          </div>
        </div>

        {showFollow && !isOwnPost && author ? (
          <FollowButton
            followerId={currentUser?.id ?? ""}
            followingId={author.id}
            targetIsPrivate={Boolean(author.isPrivate)}
            className="-mr-1 -mt-1 shrink-0"
          />
        ) : (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={s["post.menuLabel"]}
              className="transition-app -mr-1 -mt-1 rounded-card p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              style={{ minHeight: 40, minWidth: 40 }}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-card border border-slate-200 bg-white shadow-modal">
                  {isOwnPost ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          router.push(`/post/${post.id}/edit`)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil size={16} className="text-slate-400" />
                        {s["post.edit"]}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setConfirmOpen(true)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                        {s["post.delete"]}
                      </button>
                    </>
                  ) : (
                    <>
                      {canMessage ? (
                        <button
                          type="button"
                          onClick={async () => {
                            setMenuOpen(false)
                            try {
                              const convId = await useChatStore
                                .getState()
                                .getOrCreateConversation(post.authorId)
                              if (convId) router.push(`/messages/${convId}`)
                            } catch (err) {
                              showToast(
                                err instanceof Error ? err.message : s["chat.cannotMessage"],
                                "error",
                              )
                            }
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <MessageSquare size={16} className="text-slate-400" />
                          {s["post.message"]}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setReportOpen(true)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Flag size={16} className="text-slate-400" />
                        {s["post.report"]}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setBlockOpen(true)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <ShieldOff size={16} />
                        {s["post.block"]}
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Region/Category/Time tags */}
      {meta}

      {/* Text */}
      {post.text ? (
        <p className="break-words text-body text-slate-800">{post.text}</p>
      ) : null}

      {/* Media */}
      {post.mediaUrl && post.mediaType ? (
        <Link href={`/post/${post.id}`} className="block">
          <MediaDisplay
            mediaUrl={post.mediaUrl}
            mediaType={post.mediaType}
            knownAspectRatio={post.mediaAspectRatio}
          />
        </Link>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-slate-100 pt-2.5">
        <SupportButton postId={post.id} />
        <Link
          href={`/post/${post.id}`}
          className="transition-app inline-flex h-11 min-h-11 items-center gap-1.5 rounded-card px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:h-9 sm:min-h-0"
        >
          <MessageCircle size={18} aria-hidden />
          {post.commentCount}
        </Link>
      </div>

      {/* Delete confirmation */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title={s["post.deleteConfirm.title"]}>
        <div className="flex flex-col gap-5">
          <p className="text-body-sm text-slate-600">{s["post.deleteConfirm.description"]}</p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {s["post.deleteConfirm.cancel"]}
            </Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>
              {s["post.deleteConfirm.delete"]}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report dialog */}
      <Modal open={reportOpen} onClose={() => setReportOpen(false)} title={s["report.title"]}>
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-slate-600">{s["report.description"]}</p>
          <div className="flex flex-col gap-2">
            {REPORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setReportReason(opt.value)}
                aria-pressed={reportReason === opt.value}
                className={cn(
                  "rounded-card border px-3 py-2.5 text-left text-sm font-medium transition-app",
                  reportReason === opt.value
                    ? "border-primary-600 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder={s["report.detailsPlaceholder"]}
            className="w-full resize-y rounded-card border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition-app placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30"
          />
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setReportOpen(false)}>
              {s["report.cancel"]}
            </Button>
            <Button loading={reporting} disabled={!reportReason} onClick={handleReport}>
              {s["report.submit"]}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block confirmation */}
      <Modal open={blockOpen} onClose={() => setBlockOpen(false)} title={s["block.title"]}>
        <div className="flex flex-col gap-5">
          <p className="text-body-sm text-slate-600">{s["block.description"]}</p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              {s["block.cancel"]}
            </Button>
            <Button variant="danger" loading={blocking} onClick={handleBlock}>
              {s["block.confirm"]}
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  )
}