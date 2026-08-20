"use client"

// Conversation thread: message history + input. Realtime keeps new messages
// appearing live, shows typing indicators and read receipts, and supports
// photo/video attachments and group conversations.
// Guarded: non-participants get an empty state (RLS would also block reads).
import { useEffect, useRef, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Send, MessageSquare, Lock, Paperclip, X, Users, Trash2, Maximize2, Download } from "lucide-react"
import { Avatar, Button, EmptyState, Skeleton, Modal } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { uploadPostMedia } from "@/lib/supabase/storage"
import { timeAgo, cn } from "@/lib/utils"
import type { Message } from "@/lib/types"
import s from "@/lib/strings"

const TYPING_TTL_MS = 4000
const TYPING_PING_MS = 2500
// Stable fallbacks for store selectors: zustand compares the selector result
// with Object.is, so a fresh `?? []` / `?? {}` per render would loop forever
// (React error #185 — "Maximum update depth exceeded").
const EMPTY_MESSAGES: Message[] = []
const EMPTY_TYPING: Record<string, number> = {}

export default function ConversationPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>
}) {
  const params = use(paramsPromise)
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === params.id))
  const messages = useChatStore((s) => s.messagesByConversation[params.id] ?? EMPTY_MESSAGES)
  const users = useUserStore((s) => s.users)
  const showToast = useToastStore((s) => s.show)
  const typingByConv = useChatStore((s) => s.typingByConversation[params.id] ?? EMPTY_TYPING)
  const otherLastRead = useChatStore((s) => s.otherLastReadByConversation[params.id])
  const memberCount = useChatStore((s) => s.memberCountByConversation[params.id] ?? 0)

  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attachment, setAttachment] = useState<{ url: string; type: "photo" | "video" } | null>(null)
  const [viewMedia, setViewMedia] = useState<{ url: string; type: "photo" | "video" } | null>(null)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lastPingRef = useRef(0)
  // 1s tick so typing indicators expire without realtime cleanup.
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(tick)
  }, [])

  // Load the conversation + messages; start realtime for the session.
  useEffect(() => {
    if (!currentUser) return
    let cancelled = false
    let poll: number | undefined

    const load = async () => {
      const ok = await useChatStore.getState().loadConversations()
      const okMessages = await useChatStore.getState().loadMessages(params.id)
      if (cancelled) return
      setLoading(false)
      setLoadError(ok && okMessages ? null : s["chat.thread.loadError"])
    }

    ;(async () => {
      await load()
    })()

    useChatStore.getState().startRealtime()
    // This conversation is open → clear its unread badge + mark read.
    useChatStore.getState().markConversationRead(params.id)

    // Auto-reload fallback: poll the thread every 8s so new messages appear
    // even if realtime drops (mobile networks, background tabs). Realtime
    // messages are deduped by id, so this never creates duplicates.
    poll = window.setInterval(() => {
      void useChatStore.getState().loadMessages(params.id)
    }, 8000)

    return () => {
      cancelled = true
      if (poll) window.clearInterval(poll)
      useChatStore.getState().setTyping(params.id, false)
      useChatStore.getState().stopRealtime()
      useChatStore.getState().setActiveConversation(null)
    }
  }, [currentUser?.id, params.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages.length, loading])

  const partner = conversation && !conversation.isGroup ? users[conversation.otherUserId] : undefined

  // Throttled typing ping while the user types.
  const pingTyping = () => {
    const nowMs = Date.now()
    if (nowMs - lastPingRef.current > TYPING_PING_MS) {
      lastPingRef.current = nowMs
      useChatStore.getState().setTyping(params.id, true)
    }
  }

  const handleSend = async () => {
    const content = draft.trim()
    if ((!content && !attachment) || sending || uploading) return
    setSending(true)
    try {
      await useChatStore.getState().sendMessage(params.id, content, attachment ?? undefined)
      setDraft("")
      setAttachment(null)
      useChatStore.getState().setTyping(params.id, false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setSending(false)
    }
  }

  const handlePickFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showToast(s["validation.fileType"], "error")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      showToast(s["validation.fileSize"], "error")
      return
    }
    setUploading(true)
    const upload = await uploadPostMedia(file)
    setUploading(false)
    if (!upload.ok || !upload.url) {
      showToast(upload.error ?? s["chat.attachmentError"], "error")
      return
    }
    setAttachment({ url: upload.url, type: file.type.startsWith("video/") ? "video" : "photo" })
  }

  const handleUnsend = async (messageId: string) => {
    const ok = await useChatStore.getState().deleteMessage(params.id, messageId)
    if (!ok) showToast(s["validation.generic"], "error")
  }

  // Who is typing right now (excluding me, within TTL).
  const typingUsers = Object.entries(typingByConv)
    .filter(([uid, ts]) => uid !== currentUser?.id && now - ts < TYPING_TTL_MS)
    .map(([uid]) => uid)
  const typingLabel = typingUsers.length > 0
    ? typingUsers.length === 1
      ? s["chat.typing.one"](users[typingUsers[0]]?.name ?? s["chat.typing.someone"])
      : s["chat.typing.multiple"]
    : null

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4">
        <EmptyState
          icon={MessageSquare}
          title={s["chat.thread.loadErrorTitle"]}
          description={loadError}
          action={
            <Button
              variant="outline"
              onClick={async () => {
                setLoading(true)
                setLoadError(null)
                const ok = await useChatStore.getState().loadConversations()
                const okMessages = await useChatStore.getState().loadMessages(params.id)
                setLoading(false)
                setLoadError(ok && okMessages ? null : s["chat.thread.loadError"])
              }}
            >
              {s["chat.thread.retry"]}
            </Button>
          }
        />
      </div>
    )
  }

  if (!conversation || (!conversation.isGroup && !partner)) {
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

  const headerName = conversation.isGroup
    ? conversation.title ?? s["chat.group"]
    : partner!.name
  const headerSub = conversation.isGroup
    ? s["chat.groupMembers"](memberCount)
    : partner!.username
      ? `@${partner!.username}`
      : null

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
        {conversation.isGroup ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Users size={18} aria-hidden />
          </span>
        ) : (
          <Avatar name={partner!.name} src={partner!.avatarUrl ?? null} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{headerName}</p>
          {headerSub ? <p className="text-xs text-slate-400">{headerSub}</p> : null}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
          title={s["chat.encrypted"]}
        >
          <Lock size={12} aria-hidden /> {s["chat.encrypted"]}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUser?.id
          // Read receipt: recipient opened the conversation after this message.
          const read = mine && Boolean(m.readAt || (otherLastRead && new Date(otherLastRead) >= new Date(m.createdAt)))
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
                {m.attachmentType === "video" && m.attachmentUrl ? (
                  <div className="relative mb-1.5">
                    <video
                      src={m.attachmentUrl}
                      controls
                      preload="metadata"
                      className="max-h-56 w-full rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setViewMedia({ url: m.attachmentUrl!, type: "video" })}
                      aria-label={s["chat.openMedia"]}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80"
                    >
                      <Maximize2 size={13} aria-hidden />
                    </button>
                  </div>
                ) : null}
                {m.attachmentType === "photo" && m.attachmentUrl ? (
                  <div className="relative mb-1.5">
                    <img
                      src={m.attachmentUrl}
                      alt={s["chat.attachmentAlt"]}
                      className="max-h-56 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setViewMedia({ url: m.attachmentUrl!, type: "photo" })}
                      aria-label={s["chat.openMedia"]}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80"
                    >
                      <Maximize2 size={13} aria-hidden />
                    </button>
                  </div>
                ) : null}
                {m.content ? (
                  <p className="break-words whitespace-pre-wrap">{m.content}</p>
                ) : null}
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-right text-[10px]",
                    mine ? "text-primary-100" : "text-slate-400",
                  )}
                >
                  {timeAgo(m.createdAt)}
                  {mine ? (
                    <span className="ml-1">{read ? s["chat.read"] : s["chat.sent"]}</span>
                  ) : null}
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => void handleUnsend(m.id)}
                      aria-label={s["chat.unsend"]}
                      title={s["chat.unsend"]}
                      className={cn(
                        "transition-app rounded p-0.5",
                        mine ? "text-primary-100/70 hover:bg-primary-700 hover:text-white" : "text-slate-300 hover:bg-slate-100 hover:text-slate-600",
                      )}
                    >
                      <Trash2 size={11} aria-hidden />
                    </button>
                  ) : null}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Typing indicator (fixed strip above composer) */}
      {typingLabel ? (
        <p className="flex items-center gap-1.5 px-1 pb-1 text-xs text-slate-400">
          <span className="flex gap-0.5">
            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
            <span className="h-1 w-1 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
          </span>
          {typingLabel}
        </p>
      ) : null}

      {/* Attachment preview */}
      {attachment ? (
        <div className="relative mb-2 w-fit max-w-xs overflow-hidden rounded-card border border-slate-200 bg-white">
          {attachment.type === "video" ? (
            <video src={attachment.url} controls className="max-h-40 w-full" />
          ) : (
            <img src={attachment.url} alt={s["chat.attachmentAlt"]} className="max-h-40 w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => setAttachment(null)}
            aria-label={s["chat.removeAttachment"]}
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
          >
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* Composer */}
      <form
        className="flex items-end gap-2 border-t border-slate-200 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          aria-hidden
          onChange={(e) => {
            void handlePickFile(e.target.files?.[0])
            e.target.value = ""
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || Boolean(attachment)}
          aria-label={s["chat.attach"]}
          className="transition-app flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
          <Paperclip size={19} />
        </button>
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            pingTyping()
          }}
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
        <Button
          type="submit"
          loading={sending || uploading}
          disabled={(!draft.trim() && !attachment) || uploading}
          aria-label={s["chat.thread.send"]}
        >
          <Send size={16} aria-hidden />
        </Button>
      </form>

      {/* Media lightbox: open full-size + download */}
      <Modal open={viewMedia !== null} onClose={() => setViewMedia(null)} title={s["chat.media"]}>
        {viewMedia ? (
          <div className="flex flex-col gap-3">
            {viewMedia.type === "video" ? (
              <video
                src={viewMedia.url}
                controls
                autoPlay
                className="max-h-[65dvh] w-full rounded-card bg-black"
              />
            ) : (
              <img
                src={viewMedia.url}
                alt={s["chat.attachmentAlt"]}
                className="max-h-[65dvh] w-full rounded-card bg-black object-contain"
              />
            )}
            <a
              href={viewMedia.url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-card bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-app hover:bg-primary-700"
            >
              <Download size={16} aria-hidden /> {s["chat.downloadMedia"]}
            </a>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
