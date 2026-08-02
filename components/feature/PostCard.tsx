"use client"

// PostCard: a full post on the feed and detail pages. Built on the base Card.
// Shows avatar, author name + VerifiedBadge (only for verified orgs),
// RegionTag, CategoryTag, timestamp, text, media, SupportButton, comment count,
// and a FollowButton (hidden for the viewer's own posts).
import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { Card, Avatar } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { MOCK_USERS } from "@/lib/mockData"
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
  const currentUser = useAuthStore((s) => s.currentUser)
  // TODO: user profile needs to be fetched from Supabase instead of MOCK_USERS.
  const author = MOCK_USERS.find((u) => u.id === post.authorId)

  const isOwnPost = currentUser?.id === post.authorId
  const isVerifiedOrg =
    author?.accountType === "organization" && author.verificationStatus === "verified"

  const meta = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <RegionTag state={post.state} district={post.district} />
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
          <Link href={`/post/${post.id}`} aria-label="View post">
            <Avatar name={author?.name ?? "Unknown"} src={author?.avatarUrl} size="sm" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Link
                href={`/post/${post.id}`}
                className="truncate text-sm font-semibold text-slate-900 hover:underline"
              >
                {author?.name ?? "Unknown"}
              </Link>
              {isVerifiedOrg ? <VerifiedBadge /> : null}
            </div>
            <div className="mt-0.5 text-body-sm text-slate-500">
              {author?.accountType === "organization" ? "Organization" : "Student"} ·{" "}
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
      </div>

      {/* Region/Category/Time tags */}
      {meta}

      {/* Text */}
      {post.text ? (
        <p className="text-body text-slate-800">{post.text}</p>
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
          className="transition-app inline-flex h-9 items-center gap-1.5 rounded-card px-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <MessageCircle size={18} aria-hidden />
          {post.commentCount}
        </Link>
      </div>
    </Card>
  )
}