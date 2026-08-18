"use client"

// Messages inbox: all 1:1 conversations, newest activity first. Each row shows
// the other user's avatar/name plus the last message preview.
import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageSquare, Lock } from "lucide-react"
import { Avatar, Button, Card, EmptyState, Skeleton } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { timeAgo } from "@/lib/utils"
import s from "@/lib/strings"

export default function MessagesPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const conversations = useChatStore((s) => s.conversations)
  const conversationsLoaded = useChatStore((s) => s.conversationsLoaded)
  const messagesByConversation = useChatStore((s) => s.messagesByConversation)
  const unreadByConversation = useChatStore((s) => s.unreadByConversation)
  const users = useUserStore((s) => s.users)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    ;(async () => {
      const ok = await useChatStore.getState().loadConversations()
      if (!cancelled) setLoadError(!ok)
    })()
    useChatStore.getState().startRealtime()
    return () => {
      cancelled = true
      useChatStore.getState().stopRealtime()
    }
  }, [currentUser?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!conversationsLoaded) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={MessageSquare}
          title={s["chat.inbox.loadErrorTitle"]}
          description={s["chat.inbox.loadError"]}
          action={
            <Button
              variant="outline"
              onClick={async () => {
                setLoadError(false)
                const ok = await useChatStore.getState().loadConversations()
                setLoadError(!ok)
              }}
            >
              {s["chat.thread.retry"]}
            </Button>
          }
        />
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={MessageSquare}
          title={s["chat.inbox.emptyTitle"]}
          description={s["chat.inbox.emptyDescription"]}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-h3 text-slate-900">{s["nav.messages"]}</h1>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
          title={s["chat.encrypted"]}
        >
          <Lock size={12} aria-hidden /> {s["chat.encrypted"]}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {conversations.map((conv) => {
          const partner = users[conv.otherUserId]
          const last = messagesByConversation[conv.id]?.slice(-1)[0]
          const unread = unreadByConversation[conv.id] ?? 0
          return (
            <Link key={conv.id} href={`/messages/${conv.id}`} className="block">
              <Card className="transition-app flex items-center gap-3 p-3 hover:bg-slate-50">
                <div className="relative shrink-0">
                  <Avatar name={partner?.name ?? "?"} src={partner?.avatarUrl ?? null} size="md" />
                  {unread > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={unread > 0 ? "truncate text-sm font-bold text-slate-900" : "truncate text-sm font-semibold text-slate-900"}>
                    {partner?.name ?? "…"}
                    {partner?.username ? (
                      <span className="ml-1 font-normal text-slate-400">@{partner.username}</span>
                    ) : null}
                  </p>
                  <p className={unread > 0 ? "truncate text-body-sm font-medium text-slate-800" : "truncate text-body-sm text-slate-500"}>
                    {last ? (
                      <>
                        {last.senderId === currentUser?.id ? "You: " : ""}
                        {last.content}
                      </>
                    ) : (
                      s["chat.inbox.noMessages"]
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {last ? timeAgo(last.createdAt) : ""}
                </span>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}