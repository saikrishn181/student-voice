"use client"

// PostCard: a full post on the feed and detail pages. Built on the base Card.
// Shows avatar, author name + VerifiedBadge (only for verified orgs),
// RegionTag, CategoryTag, timestamp, text, media, SupportButton, comment count,
// and a FollowButton (hidden for the viewer's own posts). Own posts show an
// actions menu (Edit / Delete) with a delete confirmation dialog.
import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Card, Avatar, Modal, Button } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { useUserById } from "@/hooks"
import s from "@/lib/strings"
import { cn, timeAgo } from "@/lib/utils"
import type { Post } from "@/lib/types"
import { MediaDisplay } from "./MediaDisplay"
import { VerifiedBadge, RegionTag, CategoryTag } from "./Badges"
import { SupportButton } from "./SupportButton"
import { FollowButton } from "./FollowButton"

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
  const showToast = useToastStore((s) => s.show)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isOwnPost = currentUser?.id === post.authorId
  const isVerifiedOrg =
    author?.accountType === "organization" && author.verificationStatus === "verified"

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

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <RegionTag state={post.state} />
      <CategoryTag category={post.category} />
      <span className="text-body-sm text-slate-400">·</span>
      <span className="text-body-sm text-slate-400" title={new Date(post.createdAt).toLocaleString()}>
        {timeAgo(post.createdAt)}
      </span>
    </div>
  )

  return (
    <Card className={cn("flex flex-col gap-3", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={`/post/${post.id}`} aria-label={s["post.viewPost"]}>
            <Avatar name={author?.name ?? s["post.unknownName"]} src={author?.avatarUrl} size="sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/post/${post.id}`}
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
            className="-mr-1 -mt-1 shrink-0"
          />
        ) : null}

        {isOwnPost ? (
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
                </div>
              </>
            ) : null}
          </div>
        ) : null}
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
    </Card>
  )
}