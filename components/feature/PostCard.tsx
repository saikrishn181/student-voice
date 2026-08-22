"use client"

// PostCard: a full post on the feed and detail pages. Built on the base Card.
// Shows avatar, author name + VerifiedBadge (only for verified orgs),
// RegionTag, CategoryTag, timestamp, text, media, SupportButton, comment count,
// and a FollowButton (hidden for the viewer's own posts). Own posts show an
// actions menu (Edit / Delete) with a delete confirmation dialog.
import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  Flag,
  ShieldOff,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  Pin,
  PinOff,
  Bookmark,
  BookmarkCheck,
  Share2,
  Eye,
  MapPin,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  TriangleAlert,
  Heart,
} from "lucide-react"
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
import { VerifiedBadge, RegionTag, CollegeBadge } from "./Badges"
import { SupportButton } from "./SupportButton"
import { FollowButton } from "./FollowButton"
import { PollDisplay } from "./PollDisplay"
import { RsvpButton } from "./RsvpButton"
import { MentionText } from "./MentionText"

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
  const toggleSave = usePostStore((s) => s.toggleSave)
  const setPostPinned = usePostStore((s) => s.setPostPinned)
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
  const [pinning, setPinning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [warningRevealed, setWarningRevealed] = useState(false)
  const [heartPop, setHeartPop] = useState(false)

  const lastTapRef = useRef<number>(0)
  const heartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toggleSupport = usePostStore((s) => s.toggleSupport)

  const triggerDoubleTapSupport = async () => {
    // Haptic feedback
    if (typeof window !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([40, 30, 40])
      } catch {}
    }

    // Show heart pop animation
    if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current)
    setHeartPop(true)
    heartTimeoutRef.current = setTimeout(() => setHeartPop(false), 850)

    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }

    if (!post.supportedByCurrentUser) {
      try {
        await toggleSupport(post.id, currentUser.id)
      } catch (err) {
        showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
      }
    }
  }

  const handlePostClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[role='menu']")
    ) {
      return
    }

    // Native mouse double click
    if (e.detail === 2) {
      void triggerDoubleTapSupport()
    }
  }

  const handlePostTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("textarea") ||
      target.closest("[role='menu']")
    ) {
      return
    }

    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0
      void triggerDoubleTapSupport()
    } else {
      lastTapRef.current = now
    }
  }

  const isOwnPost = currentUser?.id === post.authorId
  const isAdmin = Boolean(currentUser?.isAdmin)
  const isBlocked = Boolean(author?.id && blockedUserIds.includes(author.id))
  const hasWarning = Boolean(post.contentWarning)
  const concealed = hasWarning && !warningRevealed
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

  const isOrgAuthor = author?.accountType === "organization"
  const isEvent = Boolean(post.eventAt)

  // Share via the native share sheet when available, else copy the link.
  const handleShare = async () => {
    setMenuOpen(false)
    const url = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: s["share.title"], text: post.text.slice(0, 140), url })
        return
      } catch {
        // User cancelled the sheet — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      showToast(s["share.copied"], "success")
    } catch {
      showToast(s["share.error"], "error")
    }
  }

  const handleToggleSave = async () => {
    if (!currentUser) {
      showToast(s["validation.loginRequired"], "error")
      return
    }
    if (saving) return
    setSaving(true)
    try {
      await toggleSave(post.id, currentUser.id)
      showToast(
        post.savedByCurrentUser ? s["post.savedRemoved"] : s["post.savedAdded"],
        "success",
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePin = async () => {
    if (pinning) return
    setPinning(true)
    setMenuOpen(false)
    try {
      await setPostPinned(post.id, !post.isPinned)
      showToast(post.isPinned ? s["post.unpinned"] : s["post.pinned"], "success")
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setPinning(false)
    }
  }

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {post.isPinned ? (
        <span className="inline-flex items-center gap-1 rounded-pill border border-accent-200 bg-accent-50 px-2.5 py-0.5 text-xs font-semibold text-accent-700">
          <Pin size={11} aria-hidden /> {s["post.pinnedBadge"]}
        </span>
      ) : null}
      {isEvent ? (
        <span className="inline-flex items-center gap-1 rounded-pill border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          <CalendarClock size={11} aria-hidden /> {s["post.eventBadge"]}
        </span>
      ) : null}
      {hasWarning ? (
        <span className="inline-flex items-center gap-1 rounded-pill border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          <TriangleAlert size={11} aria-hidden /> {s[`post.warning.${post.contentWarning}` as keyof typeof s] as string}
        </span>
      ) : null}
      <RegionTag state={post.state} />
      {post.hashtags.length > 0 &&
        post.hashtags.map((tag) => (
          <Link
            key={tag}
            href={`/tag/${encodeURIComponent(tag)}`}
            className="rounded-pill border border-primary-100 bg-primary-50/70 px-2.5 py-0.5 text-xs font-semibold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-100"
          >
            #{tag}
          </Link>
        ))}
      <span className="text-body-sm text-slate-400">·</span>
      <span className="text-body-sm text-slate-400" title={new Date(post.createdAt).toLocaleString()}>
        {timeAgo(post.createdAt)}
      </span>
      {post.editedAt ? (
        <>
          <span className="text-body-sm text-slate-400">·</span>
          <span className="text-body-sm text-slate-400">{s["post.edited"]}</span>
        </>
      ) : null}
      {post.viewCount > 0 ? (
        <>
          <span className="text-body-sm text-slate-400">·</span>
          <span className="inline-flex items-center gap-1 text-body-sm text-slate-400">
            <Eye size={13} aria-hidden /> {post.viewCount}
          </span>
        </>
      ) : null}
    </div>
  )

  // Blocked-author posts are removed from the store; this is a belt-and-braces
  // guard so a stale render can never leak content.
  if (isBlocked) return null

  return (
    <Card
      onClick={handlePostClick}
      onTouchStart={handlePostTouchStart}
      className={cn(
        "transition-app relative overflow-hidden flex flex-col gap-3 hover:shadow-lift sm:hover:-translate-y-0.5",
        className
      )}
    >
      {/* Floating Heart Pop Animation on Double Tap */}
      {heartPop ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/5 backdrop-blur-[0.5px]"
        >
          <div className="animate-double-tap-heart flex items-center justify-center drop-shadow-2xl">
            <Heart
              size={80}
              className="fill-accent-500 text-accent-500 drop-shadow-[0_8px_30px_rgba(237,95,42,0.6)]"
            />
          </div>
        </div>
      ) : null}

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
              {author?.collegeVerified ? <CollegeBadge /> : null}
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
          <div
            className="relative shrink-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") setMenuOpen(false)
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={s["post.menuLabel"]}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              className="transition-app -mr-1 -mt-1 rounded-card p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              style={{ minHeight: 40, minWidth: 40 }}
            >
              <MoreHorizontal size={18} />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-card border border-slate-200 bg-white shadow-modal"
                >
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
                      {isOrgAuthor ? (
                        <button
                          type="button"
                          onClick={handleTogglePin}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {post.isPinned ? (
                            <PinOff size={16} className="text-slate-400" />
                          ) : (
                            <Pin size={16} className="text-slate-400" />
                          )}
                          {post.isPinned ? s["post.unpin"] : s["post.pin"]}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleShare}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Share2 size={16} className="text-slate-400" />
                        {s["post.share"]}
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
                      {isAdmin ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            setConfirmOpen(true)
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                          {s["post.deleteAsMod"]}
                        </button>
                      ) : null}
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
                        onClick={handleShare}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Share2 size={16} className="text-slate-400" />
                        {s["post.share"]}
                      </button>
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

      {/* Content warning gate: blur text + media until explicitly revealed */}
      {concealed ? (
        <div className="flex flex-col items-center gap-3 rounded-card border border-red-200 bg-red-50/60 p-4 text-center">
          <TriangleAlert size={20} className="text-red-600" aria-hidden />
          <p className="text-body-sm font-medium text-red-800">
            {s[`post.warning.${post.contentWarning}` as keyof typeof s] as string}
          </p>
          <p className="max-w-sm text-body-sm text-red-700/80">{s["post.warningBlurHint"]}</p>
          <Button size="sm" onClick={() => setWarningRevealed(true)}>
            {s["post.revealWarning"]}
          </Button>
        </div>
      ) : null}

      {/* Text */}
      {post.text ? (
        <MentionText
          text={post.text}
          className={cn("break-words text-body text-slate-800", concealed && "blur-md select-none")}
        />
      ) : null}

      {/* Event card */}
      {isEvent ? (
        <div className={cn("flex flex-col gap-2 rounded-card border border-amber-200 bg-amber-50/60 p-3", concealed && "blur-md select-none")}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-800">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={15} className="text-amber-600" aria-hidden />
              {new Date(post.eventAt!).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            {post.eventLocation ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={15} className="text-amber-600" aria-hidden />
                {post.eventLocation}
              </span>
            ) : null}
          </div>
          <RsvpButton postId={post.id} />
        </div>
      ) : null}

      {/* Poll */}
      {post.poll ? (
        <div className={cn(concealed && "pointer-events-none select-none blur-md")}>
          <PollDisplay postId={post.id} poll={post.poll} />
        </div>
      ) : null}

      {/* Media */}
      {post.mediaUrl && post.mediaType ? (
        <Link href={`/post/${post.id}`} className={cn("block", concealed && "pointer-events-none select-none blur-md")}>
          <MediaDisplay
            mediaUrl={post.mediaUrl}
            mediaType={post.mediaType}
            knownAspectRatio={post.mediaAspectRatio}
          />
        </Link>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-1 border-t border-[#F0EAE0] pt-2.5">
        <SupportButton postId={post.id} />
        <Link
          href={`/post/${post.id}`}
          className="transition-app inline-flex h-11 min-h-11 items-center gap-1.5 rounded-card px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:h-9 sm:min-h-0"
        >
          <MessageCircle size={18} aria-hidden />
          {post.commentCount}
        </Link>
        <button
          type="button"
          onClick={handleToggleSave}
          aria-pressed={post.savedByCurrentUser}
          aria-label={post.savedByCurrentUser ? s["post.unsave"] : s["post.save"]}
          className={cn(
            "transition-app inline-flex h-11 min-h-11 items-center gap-1.5 rounded-card px-3 text-sm font-medium sm:h-9 sm:min-h-0",
            post.savedByCurrentUser
              ? "text-primary-600 hover:bg-primary-50"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
          )}
        >
          {post.savedByCurrentUser ? (
            <BookmarkCheck size={18} aria-hidden />
          ) : (
            <Bookmark size={18} aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={handleShare}
          aria-label={s["post.share"]}
          className="transition-app inline-flex h-11 min-h-11 items-center gap-1.5 rounded-card px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:h-9 sm:min-h-0"
        >
          <Share2 size={18} aria-hidden />
        </button>
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