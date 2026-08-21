"use client"

// Single notification row. Unread items get a tinted background + indicator dot.
// Clicking marks the notification read and, when it references a post, deep-links
// to that post's detail page. The actor's name is always a link to their profile.
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

export function NotificationItem({ notification }: NotificationItemProps) {
  const actor = useUserById(notification.actorId)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const Icon = notificationIcon(notification.type)
  const unread = !notification.read
  const pathname = usePathname()

  // follow_request notifications have no post; deep-link to the requester's
  // profile so the viewer can review the request.
  const cardHref =
    notification.type === "follow_request"
      ? `/profile/${notification.actorId}`
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
        unread && "border-primary-200 bg-primary-50/60",
        unread && "hover:border-primary-300",
      )}
    >
      <Avatar name={actor?.name ?? s["post.unknownName"]} src={actor?.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
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
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
          <Icon size={14} className="text-accent-500" aria-hidden />
          {timeAgo(notification.createdAt)}
        </p>
      </div>
      {unread ? (
        <span
          className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary-500"
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
