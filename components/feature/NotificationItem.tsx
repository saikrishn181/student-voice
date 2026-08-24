"use client"

// Single notification row. Unread items get a tinted background + indicator dot.
// Clicking marks the notification read and, when it references a post, deep-links
// to that post's detail page. The actor's name is always a link to their profile.
// Moderation notifications (content_warning, post_removed) render with special
// system styling and metadata details.
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Avatar } from "@/components/ui"
import { useUserById } from "@/hooks"
import { notificationIcon } from "@/lib/notifications"
import { useNotificationStore } from "@/lib/store/useNotificationStore"
import s from "@/lib/strings"
import { cn, timeAgo } from "@/lib/utils"
import type { Notification } from "@/lib/types"

interface NotificationItemProps {
  notification: Notification
}

/** True when this is a system-generated moderation notification. */
function isModerationNotification(type: string): boolean {
  return type === "content_warning" || type === "post_removed"
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const actor = useUserById(notification.actorId)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const Icon = notificationIcon(notification.type)
  const unread = !notification.read
  const pathname = usePathname()
  const isModeration = isModerationNotification(notification.type)

  // Parse metadata for moderation notifications
  let moderationMeta: { reason?: string; strikeCount?: number; action?: string; category?: string } | null = null
  if (isModeration && notification.metadata) {
    try {
      moderationMeta = JSON.parse(notification.metadata)
    } catch {}
  }

  // follow_request notifications have no post; deep-link to the requester's
  // profile so the viewer can review the request.
  const cardHref =
    notification.type === "follow_request"
      ? `/profile/${notification.actorId}`
      : notification.type === "content_warning" && notification.postId
        ? `/post/${notification.postId}`
        : notification.postId
          ? `/post/${notification.postId}`
          : undefined

  const onClick = () => {
    if (unread) markAsRead(notification.id)
  }

  const profileHref = `/profile/${notification.actorId}`

  const body = (
    <div
      className={cn(
        "surface-card flex items-start gap-3 p-4 transition-colors",
        isModeration && notification.type === "post_removed" && "border-red-200 bg-red-50/60",
        isModeration && notification.type === "content_warning" && "border-amber-200 bg-amber-50/60",
        !isModeration && unread && "border-primary-200 bg-primary-50/60",
        !isModeration && unread && "hover:border-primary-300",
      )}
    >
      {isModeration ? (
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          notification.type === "post_removed" ? "bg-red-100" : "bg-amber-100",
        )}>
          <Icon
            size={18}
            className={notification.type === "post_removed" ? "text-red-600" : "text-amber-600"}
            aria-hidden
          />
        </div>
      ) : (
        <Avatar name={actor?.name ?? s["post.unknownName"]} src={actor?.avatarUrl} size="sm" />
      )}
      <div className="min-w-0 flex-1">
        {isModeration ? (
          <>
            <p className={cn(
              "text-body-sm font-semibold",
              notification.type === "post_removed" ? "text-red-800" : "text-amber-800",
            )}>
              {notification.type === "post_removed" ? "🚫 Post Removed" : "⚠️ Content Warning Applied"}
            </p>
            <p className={cn(
              "mt-0.5 text-body-sm",
              notification.type === "post_removed" ? "text-red-700" : "text-amber-700",
            )}>
              {s[`notification.type.${notification.type}` as keyof typeof s] as string}
            </p>
            {moderationMeta?.reason ? (
              <p className="mt-1 text-xs text-slate-500 italic">
                {moderationMeta.reason}
              </p>
            ) : null}
            {moderationMeta?.strikeCount ? (
              <p className="mt-1 text-xs font-medium text-red-600">
                ⚡ Strike {moderationMeta.strikeCount} of 10
              </p>
            ) : null}
            {moderationMeta?.action === "blurred" ? (
              <p className="mt-1 text-xs text-amber-600">
                Your post is still visible with a blur overlay. No strike issued.
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-body-sm text-slate-700">
            <Link
              href={profileHref}
              className="font-semibold text-slate-900 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {actor?.name ?? s["post.unknownAuthor"]}
            </Link>{" "}
            {s[`notification.type.${notification.type}` as keyof typeof s] as string}
          </p>
        )}
        <p className={cn(
          "mt-0.5 flex items-center gap-1.5 text-xs",
          isModeration
            ? notification.type === "post_removed" ? "text-red-400" : "text-amber-400"
            : "text-slate-400",
        )}>
          {!isModeration && <Icon size={14} className="text-accent-500" aria-hidden />}
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {unread ? (
        <span
          className={cn(
            "mt-2 h-2.5 w-2.5 shrink-0 rounded-full",
            notification.type === "post_removed" ? "bg-red-500" : notification.type === "content_warning" ? "bg-amber-500" : "bg-primary-500",
          )}
          aria-label={s["notification.unreadLabel"]}
        />
      ) : null}
    </div>
  )

  if (cardHref) {
    return (
      <Link href={cardHref} onClick={onClick} className="block">
        {body}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {body}
    </button>
  )
}
