"use client"

// Conversation thread: message history + input. Realtime keeps new messages
// appearing live, shows typing indicators and read receipts, and supports
// photo/video attachments, editing messages, long-press actions, and group conversations.
// Guarded: non-participants get an empty state (RLS would also block reads).
import { useEffect, useRef, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Send,
  MessageSquare,
  Lock,
  Paperclip,
  X,
  Users,
  Trash2,
  Maximize2,
  Download,
  Pencil,
  Copy,
  Check,
  CheckCheck,
  MoreVertical,
} from "lucide-react"
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

  // Long press / Action menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [actionMenuOpen, setActionMenuOpen] = useState(false)

  // Edit message state
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [editDraft, setEditDraft] = useState("")
  const [editingSaving, setEditingSaving] = useState(false)

  // Delete for everyone confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState<{ message: Message } | null>(null)
  const [deletingEveryone, setDeletingEveryone] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastPingRef = useRef(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)

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

  // Long press handling on messages
  const handleTouchStart = (m: Message, e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current)
    longPressTimerRef.current = setTimeout(() => {
      if (typeof window !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate(40)
        } catch {}
      }
      setSelectedMessage(m)
      setActionMenuOpen(true)
    }, 450)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y)
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    touchStartPosRef.current = null
  }

  const handleContextMenu = (m: Message, e: React.MouseEvent) => {
    e.preventDefault()
    setSelectedMessage(m)
    setActionMenuOpen(true)
  }

  const handleSend = async () => {
    // If we're editing an existing message
    if (editingMessage) {
      const trimmed = editDraft.trim()
      if (!trimmed) return
      setEditingSaving(true)
      const ok = await useChatStore.getState().editMessage(params.id, editingMessage.id, trimmed)
      setEditingSaving(false)
      if (ok) {
        showToast(s["chat.editSuccess"], "success")
        setEditingMessage(null)
        setEditDraft("")
      } else {
        showToast(s["validation.generic"], "error")
      }
      return
    }

    // Normal send
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

  const handleDeleteForMe = (messageId: string) => {
    useChatStore.getState().deleteMessageForMe(params.id, messageId)
    showToast(s["chat.deleteForMeSuccess"], "success")
    setActionMenuOpen(false)
  }

  const handleDeleteForEveryone = async () => {
    if (!deleteConfirm) return
    setDeletingEveryone(true)
    const ok = await useChatStore.getState().deleteMessageForEveryone(params.id, deleteConfirm.message.id)
    setDeletingEveryone(false)
    setDeleteConfirm(null)
    if (ok) {
      showToast(s["chat.deleteForEveryoneSuccess"], "success")
    } else {
      showToast(s["validation.generic"], "error")
    }
  }

  const handleStartEdit = (m: Message) => {
    setEditingMessage(m)
    setEditDraft(m.content)
    setActionMenuOpen(false)
    setTimeout(() => textareaRef.current?.focus(), 100)
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
    <div className="flex h-dvh w-full max-w-3xl flex-col px-2 sm:px-6 mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-paper/95 py-3 backdrop-blur-md">
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
          <p className="truncate text-sm font-bold text-slate-950">{headerName}</p>
          {headerSub ? <p className="text-xs text-slate-500">{headerSub}</p> : null}
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
          title={s["chat.encrypted"]}
        >
          <Lock size={12} aria-hidden /> {s["chat.encrypted"]}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2.5 overflow-y-auto px-1 py-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUser?.id
          // Read receipt: recipient opened the conversation after this message.
          const read = mine && Boolean(m.readAt || (otherLastRead && new Date(otherLastRead) >= new Date(m.createdAt)))
          return (
            <div key={m.id} className={cn("group relative flex items-center gap-1.5", mine ? "justify-end" : "justify-start")}>
              {/* Desktop action menu trigger */}
              {mine ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessage(m)
                    setActionMenuOpen(true)
                  }}
                  title={s["chat.actions.title"]}
                  aria-label={s["chat.actions.title"]}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <MoreVertical size={14} />
                </button>
              ) : null}

              <div
                onTouchStart={(e) => handleTouchStart(m, e)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={(e) => handleContextMenu(m, e)}
                className={cn(
                  "max-w-[85%] select-none rounded-2xl px-4 py-2.5 text-body-sm transition-transform active:scale-[0.98] shadow-2xs",
                  mine
                    ? "rounded-br-xs bg-primary-600 text-white"
                    : "rounded-bl-xs border border-slate-200 bg-white text-slate-900",
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
                  <p className="break-words whitespace-pre-wrap leading-relaxed">{m.content}</p>
                ) : null}
                <p
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-right text-[10px]",
                    mine ? "text-primary-100" : "text-slate-400",
                  )}
                >
                  {m.editedAt ? (
                    <span className={cn("italic opacity-80", mine ? "text-primary-100" : "text-slate-400")}>
                      ({s["chat.edited"]})
                    </span>
                  ) : null}
                  <span>{timeAgo(m.createdAt)}</span>
                  {mine ? (
                    <span
                      className={cn("ml-1 font-bold text-xs tracking-tighter inline-flex items-center", read ? "text-emerald-200" : "opacity-75")}
                      title={read ? "Read" : "Sent"}
                    >
                      {read ? <CheckCheck size={14} /> : <Check size={14} />}
                    </span>
                  ) : null}
                </p>
              </div>

              {/* Desktop action menu trigger for received messages */}
              {!mine ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessage(m)
                    setActionMenuOpen(true)
                  }}
                  title={s["chat.actions.title"]}
                  aria-label={s["chat.actions.title"]}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <MoreVertical size={14} />
                </button>
              ) : null}
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

      {/* Editing message indicator banner */}
      {editingMessage ? (
        <div className="flex items-center justify-between rounded-t-card border-x border-t border-primary-200 bg-primary-50 px-3.5 py-2 text-xs text-primary-900 shadow-sm animate-fade-in">
          <div className="flex min-w-0 items-center gap-2">
            <Pencil size={13} className="shrink-0 text-primary-600" />
            <span className="font-semibold">{s["chat.editingBanner"]}:</span>
            <span className="truncate text-slate-600">&ldquo;{editingMessage.content}&rdquo;</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null)
              setEditDraft("")
            }}
            className="ml-3 shrink-0 font-semibold text-primary-700 hover:text-primary-900 transition-app"
          >
            {s["chat.cancelEdit"]}
          </button>
        </div>
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
        className={cn(
          "sticky bottom-0 z-20 flex items-end gap-2 bg-paper py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          editingMessage ? "border-x border-b border-primary-200 rounded-b-card bg-primary-50/30 px-2 pb-2" : "border-t border-slate-200"
        )}
        onSubmit={(e) => {
          e.preventDefault()
          handleSend()
        }}
      >
        {!editingMessage ? (
          <>
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
          </>
        ) : null}
        <textarea
          ref={textareaRef}
          value={editingMessage ? editDraft : draft}
          onChange={(e) => {
            if (editingMessage) {
              setEditDraft(e.target.value)
            } else {
              setDraft(e.target.value)
              pingTyping()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            } else if (e.key === "Escape" && editingMessage) {
              setEditingMessage(null)
              setEditDraft("")
            }
          }}
          placeholder={editingMessage ? s["chat.thread.placeholder"] : s["chat.thread.placeholder"]}
          rows={1}
          maxLength={2000}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-card border border-slate-200 bg-white px-3.5 py-2.5 text-body-sm text-slate-800 placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
          aria-label={editingMessage ? s["chat.saveEdit"] : s["chat.thread.placeholder"]}
        />
        <Button
          type="submit"
          loading={sending || uploading || editingSaving}
          disabled={editingMessage ? !editDraft.trim() : (!draft.trim() && !attachment) || uploading}
          aria-label={editingMessage ? s["chat.saveEdit"] : s["chat.thread.send"]}
        >
          {editingMessage ? <Check size={16} aria-hidden /> : <Send size={16} aria-hidden />}
        </Button>
      </form>

      {/* Long-Press / Options Action Modal */}
      <Modal
        open={actionMenuOpen && selectedMessage !== null}
        onClose={() => {
          setActionMenuOpen(false)
          setSelectedMessage(null)
        }}
        title={s["chat.actions.title"]}
      >
        {selectedMessage ? (
          <div className="flex flex-col gap-3">
            {/* Snippet preview */}
            <div className="max-h-24 overflow-y-auto rounded-card border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {selectedMessage.attachmentUrl ? (
                <p className="mb-1 italic text-slate-500">{s["chat.attachmentLabel"]}</p>
              ) : null}
              {selectedMessage.content ? (
                <p className="break-words">{selectedMessage.content}</p>
              ) : null}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1 pt-1">
              {/* Edit message (only available for sender's own text messages) */}
              {selectedMessage.senderId === currentUser?.id && selectedMessage.content ? (
                <button
                  type="button"
                  onClick={() => handleStartEdit(selectedMessage)}
                  className="flex w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition-app hover:bg-slate-100"
                >
                  <Pencil size={17} className="shrink-0 text-primary-600" />
                  <span>{s["chat.actions.edit"]}</span>
                </button>
              ) : null}

              {/* Copy text */}
              {selectedMessage.content ? (
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(selectedMessage.content)
                    showToast(s["chat.actions.copied"], "success")
                    setActionMenuOpen(false)
                    setSelectedMessage(null)
                  }}
                  className="flex w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-sm font-medium text-slate-800 transition-app hover:bg-slate-100"
                >
                  <Copy size={17} className="shrink-0 text-slate-500" />
                  <span>{s["chat.actions.copy"]}</span>
                </button>
              ) : null}

              {/* Delete for you */}
              <button
                type="button"
                onClick={() => {
                  handleDeleteForMe(selectedMessage.id)
                  setSelectedMessage(null)
                }}
                className="flex w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-sm font-medium text-slate-700 transition-app hover:bg-slate-100"
              >
                <Trash2 size={17} className="shrink-0 text-slate-500" />
                <span>{s["chat.actions.deleteForMe"]}</span>
              </button>

              {/* Delete for everyone (sender or admin) */}
              {selectedMessage.senderId === currentUser?.id || currentUser?.isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    const msg = selectedMessage
                    setActionMenuOpen(false)
                    setSelectedMessage(null)
                    setDeleteConfirm({ message: msg })
                  }}
                  className="flex w-full items-center gap-3 rounded-card px-3.5 py-2.5 text-left text-sm font-medium text-danger-600 transition-app hover:bg-danger-50"
                >
                  <Trash2 size={17} className="shrink-0 text-danger-600" />
                  <span>{s["chat.actions.deleteForEveryone"]}</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Delete for Everyone Confirmation Modal */}
      <Modal
        open={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        title={s["chat.actions.deleteForEveryone"]}
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-slate-600">
            {s["chat.actions.deleteForEveryoneConfirm"]}
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deletingEveryone}
            >
              {s["chat.actions.cancel"]}
            </Button>
            <Button
              variant="danger"
              loading={deletingEveryone}
              onClick={() => void handleDeleteForEveryone()}
            >
              {s["chat.actions.deleteForEveryone"]}
            </Button>
          </div>
        </div>
      </Modal>

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
