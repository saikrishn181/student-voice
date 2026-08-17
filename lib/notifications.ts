// Notification helpers: grouping (Today / This week / Earlier), per-type icon
// choice and default detail text. Pure functions — no React hooks.
import {
  BadgeCheck,
  Clock,
  Heart,
  HeartHandshake,
  MessageCircle,
  UserPlus,
  type LucideIcon,
} from "lucide-react"

import type { Notification, NotificationType } from "@/lib/types"

const DAY = 24 * 60 * 60 * 1000

export type NotificationGroupTitle = "Today" | "This week" | "Earlier"

export interface NotificationGroup {
  title: NotificationGroupTitle
  items: Notification[]
}

// Bucket notifications into Today / This week / Earlier. Empty buckets are
// omitted so the UI can simply map over what is returned.
export function groupNotifications(
  notifications: Notification[],
  now = Date.now(),
): NotificationGroup[] {
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)

  const sorted = [...notifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const buckets: NotificationGroup[] = [
    { title: "Today", items: [] },
    { title: "This week", items: [] },
    { title: "Earlier", items: [] },
  ]

  for (const n of sorted) {
    const t = new Date(n.createdAt).getTime()
    if (t >= startOfToday.getTime()) buckets[0].items.push(n)
    else if (t >= now - 7 * DAY) buckets[1].items.push(n)
    else buckets[2].items.push(n)
  }

  return buckets.filter((b) => b.items.length > 0)
}

// Short verb phrase rendered after the actor name, e.g. "Rahul Menon supported
// your post". Copy lives in lib/strings.ts; this helper is kept only for
// mapping type → icon.
export function notificationIcon(type: NotificationType): LucideIcon {
  switch (type) {
    case "support":
      return Heart
    case "comment":
      return MessageCircle
    case "follow":
      return UserPlus
    case "follow_request":
      return Clock
    case "offer_help":
      return HeartHandshake
    case "verification_approved":
      return BadgeCheck
    default:
      return Heart
  }
}