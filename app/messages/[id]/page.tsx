"use client"

// Conversation thread: message history + input. Realtime keeps new messages
// appearing live. Guarded: non-participants get an empty state (RLS would also
// block the reads).
import { useEffect, useRef, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, MessageSquare } from "lucide-react"
import { Avatar, Button, EmptyState, Skeleton } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { timeAgo, cn } from "@/lib/utils"
import s from "@/lib/strings"

export default function ConversationPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === params.id))
  const messages = useChatStore((s) => s.messagesByConversation[params.id] ?? [])
  const users = useUserStore((s) => s.users)
  const showToast = useToastStore((s) => s.show)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load the conversation + messages; start realtime for the session.
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    ;(async () => {
      await useChatStore.getState().loadConversations()
      await useChatStore.getState().loadMessages(params.id)
      if (!cancelled) setLoading(false)
    })()
    useChatStore.getState().startRealtime()
    return () => {
      cancelled = true
      useChatStore.getState().stopRealtime()
    }
  }, [currentUser?.id, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, loading])

  const partner = conversation ? users[conversation.otherUserId] : undefined

  const handleSend = async () => {
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    const ok = await useChatStore.getState().sendMessage(params.id, content)
    setSending(false)
    if (!ok) {
      showToast(s["validation.generic"], "error")
      return
    }
    setDraft("")
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    )
  }

  if (!conversation || !partner) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={MessageSquare}
          title={s["chat.thread.notFoundTitle"]}
          description={s["chat.thread.notFoundDescription"]}
          action={
            <Link href="/messages">
              <Button variant="outline">
                <ArrowLeft size={16} aria-hidden /> {s["chat.thread.back"]}
              </Button>
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] w-full max-w-2xl flex-col px-4 lg:h-[calc(100dvh-2rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 py-3">
        <button
          type="button"
          onClick={() => router.push("/messages")}
          aria-label={s["chat.thread.back"]}
          className="transition-app -ml-1 rounded-card p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft size={20} />
        </button>
        <Avatar name={partner.name} src={partner.avatarUrl ?? null} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{partner.name}</p>
          {partner.username ? (
            <p className="text-xs text-slate-400">@{partner.username}</p>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUser?.id
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-card px-3.5 py-2 text-body-sm",
                  mine
                    ? "rounded-br-sm bg-primary-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-800",
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.content}</p>
                <p
                  className={cn(
                    "mt-1 text-right text-[10px]",
                    mine ? "text-primary-100" : "text-slate-400",
                  )}
                >
                  {timeAgo(m.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        className="flex items-end gap-2 border-t border-slate-200 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={s["chat.thread.placeholder"]}
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-card border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label={s["chat.thread.placeholder"]}
        />
        <Button type="submit" loading={sending} disabled={!draft.trim()} aria-label={s["chat.thread.send"]}>
          <Send size={16} aria-hidden />
        </Button>
      </form>
    </div>
  )
}