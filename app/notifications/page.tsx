"use client"

// Notifications — for the logged-in user, grouped into Today / This week /
// Earlier. Data comes from the Supabase `notifications` table; marking read is
// an UPDATE on the row.
import { useMemo } from "react"
import { Bell, CheckCheck } from "lucide-react"

import { NotificationItem } from "@/components/feature"
import { Button, EmptyState, Spinner } from "@/components/ui"
import { groupNotifications } from "@/lib/notifications"
import type { NotificationGroupTitle } from "@/lib/notifications"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useNotificationStore } from "@/lib/store/useNotificationStore"
import s from "@/lib/strings"

const GROUP_TITLES: Record<NotificationGroupTitle, string> = {
  Today: s["notifications.group.today"],
  "This week": s["notifications.group.thisWeek"],
  Earlier: s["notifications.group.earlier"],
}

export default function NotificationsPage() {
  const { notifications, status } = useNotificationStore()
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const currentUser = useAuthStore((s) => s.currentUser)

  const mine = useMemo(
    () => notifications.filter((n) => n.userId === currentUser?.id),
    [notifications, currentUser],
  )
  const unreadCount = useMemo(() => mine.filter((n) => !n.read).length, [mine])
  const groups = useMemo(() => groupNotifications(mine), [mine])

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="sr-only">{s["notifications.title"]}</h1>
          <p className="text-body-sm text-slate-500">
            {unreadCount > 0 ? s["notifications.unread"](unreadCount) : s["notifications.caughtUp"]}
          </p>
          {unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck size={16} aria-hidden />}
              onClick={markAllAsRead}
            >
              {s["notifications.markAllRead"]}
            </Button>
          ) : null}
        </div>

        {status === "loading" ? (
          <div className="flex justify-center py-12">
            <Spinner size={28} />
          </div>
        ) : mine.length === 0 ? (
          <div className="surface-card">
            <EmptyState
              icon={Bell}
              title={s["notifications.empty.title"]}
              description={s["notifications.empty.description"]}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.title} className="flex flex-col gap-3">
                <h2 className="text-h4 text-slate-900">{GROUP_TITLES[group.title]}</h2>
                {group.items.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}