"use client"

// Messages inbox: all 1:1 conversations, newest activity first. Each row shows
// the other user's avatar/name plus the last message preview.
import { useEffect } from "react"
import Link from "next/link"
import { MessageSquare } from "lucide-react"
import { Avatar, Card, EmptyState, Skeleton } from "@/components/ui"
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
  const users = useUserStore((s) => s.users)

  useEffect(() => {
    if (!currentUser) return
    useChatStore.getState().loadConversations()
    useChatStore.getState().startRealtime()
    return () => {
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
      <h1 className="mb-4 text-h3 text-slate-900">{s["nav.messages"]}</h1>
      <div className="flex flex-col gap-2">
        {conversations.map((conv) => {
          const partner = users[conv.otherUserId]
          const last = messagesByConversation[conv.id]?.slice(-1)[0]
          return (
            <Link key={conv.id} href={`/messages/${conv.id}`} className="block">
              <Card className="transition-app flex items-center gap-3 p-3 hover:bg-slate-50">
                <Avatar name={partner?.name ?? "?"} src={partner?.avatarUrl ?? null} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {partner?.name ?? "…"}
                    {partner?.username ? (
                      <span className="ml-1 font-normal text-slate-400">@{partner.username}</span>
                    ) : null}
                  </p>
                  <p className="truncate text-body-sm text-slate-500">
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