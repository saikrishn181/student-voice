"use client"

// Messages inbox: all 1:1 + group conversations, newest activity first. Each
// row shows the other user's avatar/name (or group title) plus the last message
// preview. Supports client-side search and creating group conversations.
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MessageSquare, Lock, Search as SearchIcon, Users, X, Check } from "lucide-react"
import { Avatar, Button, Card, EmptyState, Modal, Input, Skeleton } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useChatStore } from "@/lib/store/useChatStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { timeAgo, cn } from "@/lib/utils"
import s from "@/lib/strings"

export default function MessagesPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  const conversations = useChatStore((s) => s.conversations)
  const conversationsLoaded = useChatStore((s) => s.conversationsLoaded)
  const messagesByConversation = useChatStore((s) => s.messagesByConversation)
  const unreadByConversation = useChatStore((s) => s.unreadByConversation)
  const memberCountByConversation = useChatStore((s) => s.memberCountByConversation)
  const users = useUserStore((s) => s.users)
  const showToast = useToastStore((s) => s.show)
  const [loadError, setLoadError] = useState(false)
  const [query, setQuery] = useState("")

  // Group-creation modal state.
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupTitle, setGroupTitle] = useState("")
  const [memberQuery, setMemberQuery] = useState("")
  const [memberResults, setMemberResults] = useState<{ id: string; name: string; avatar_url: string | null }[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

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

  // Debounced member search for the group modal.
  useEffect(() => {
    if (!groupOpen || memberQuery.trim().length < 2) {
      setMemberResults([])
      return
    }
    let cancelled = false
    const supabase = createSupabaseBrowserClient()
    supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .neq("id", currentUser?.id)
      .ilike("name", `%${memberQuery.trim()}%`)
      .limit(8)
      .then(({ data }) => {
        if (cancelled) return
        setMemberResults((data ?? []) as { id: string; name: string; avatar_url: string | null }[])
      })
    return () => {
      cancelled = true
    }
  }, [groupOpen, memberQuery, currentUser?.id])

  const handleCreateGroup = async () => {
    if (creating) return
    setCreating(true)
    try {
      const convId = await useChatStore.getState().createGroupConversation(
        groupTitle,
        Array.from(picked),
      )
      if (convId) {
        setGroupOpen(false)
        setGroupTitle("")
        setPicked(new Set())
        window.location.href = `/messages/${convId}`
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    } finally {
      setCreating(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((conv) => {
      if (conv.isGroup) {
        if (conv.title?.toLowerCase().includes(q)) return true
      } else {
        const partner = users[conv.otherUserId]
        if (partner?.name.toLowerCase().includes(q)) return true
        if (partner?.username?.toLowerCase().includes(q)) return true
      }
      return (messagesByConversation[conv.id] ?? []).some((m) =>
        m.content.toLowerCase().includes(q),
      )
    })
  }, [conversations, query, users, messagesByConversation])

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
          action={
            <Button onClick={() => setGroupOpen(true)}>
              <Users size={16} aria-hidden /> {s["chat.newGroup"]}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-h3 text-slate-900">{s["nav.messages"]}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setGroupOpen(true)}>
            <Users size={15} aria-hidden /> {s["chat.newGroup"]}
          </Button>
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
            title={s["chat.encrypted"]}
          >
            <Lock size={12} aria-hidden /> {s["chat.encrypted"]}
          </span>
        </div>
      </div>

      {/* Search */}
      {conversations.length > 1 ? (
        <div className="relative mb-3">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            name="chat-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={s["chat.searchPlaceholder"]}
            className="pl-9"
            aria-label={s["chat.searchPlaceholder"]}
          />
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={s["chat.searchEmptyTitle"]}
          description={s["chat.searchEmptyDescription"]}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((conv) => {
            const partner = users[conv.otherUserId]
            const last = messagesByConversation[conv.id]?.slice(-1)[0]
            const unread = unreadByConversation[conv.id] ?? 0
            const members = memberCountByConversation[conv.id]
            const isGroup = conv.isGroup
            return (
              <Link key={conv.id} href={`/messages/${conv.id}`} className="block">
                <Card className="transition-app flex items-center gap-3 p-3 hover:bg-slate-50">
                  <div className="relative shrink-0">
                    {isGroup ? (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                        <Users size={18} aria-hidden />
                      </span>
                    ) : (
                      <Avatar name={partner?.name ?? "?"} src={partner?.avatarUrl ?? null} size="md" />
                    )}
                    {unread > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-[11px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={unread > 0 ? "truncate text-sm font-bold text-slate-900" : "truncate text-sm font-semibold text-slate-900"}>
                      {isGroup ? (conv.title ?? s["chat.group"]) : (partner?.name ?? "…")}
                      {!isGroup && partner?.username ? (
                        <span className="ml-1 font-normal text-slate-400">@{partner.username}</span>
                      ) : isGroup ? (
                        <span className="ml-1 font-normal text-slate-400">
                          {s["chat.groupMembers"](members ?? 0)}
                        </span>
                      ) : null}
                    </p>
                    <p className={unread > 0 ? "truncate text-body-sm font-medium text-slate-800" : "truncate text-body-sm text-slate-500"}>
                      {last ? (
                        <>
                          {last.senderId === currentUser?.id ? "You: " : ""}
                          {last.attachmentType ? s["chat.attachmentLabel"] : ""}
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
      )}

      {/* New group modal */}
      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title={s["chat.newGroup"]}
      >
        <div className="flex flex-col gap-4">
          <Input
            label={s["chat.groupName"]}
            name="group-title"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            maxLength={60}
            placeholder={s["chat.groupNamePlaceholder"]}
          />

          <div>
            <Input
              label={s["chat.addMembers"]}
              name="member-search"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
              placeholder={s["chat.addMembersPlaceholder"]}
            />
            <div className="mt-2 flex flex-col gap-1">
              {picked.size > 0 ? (
                <div className="mb-1 flex flex-wrap gap-1.5">
                  {Array.from(picked).map((id) => {
                    const member = users[id]
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-pill bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                      >
                        {member?.name ?? "…"}
                        <button
                          type="button"
                          onClick={() =>
                            setPicked((prev) => {
                              const next = new Set(prev)
                              next.delete(id)
                              return next
                            })
                          }
                          aria-label={s["chat.removeMember"]}
                          className="text-primary-400 hover:text-primary-700"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                </div>
              ) : null}
              {memberResults.map((member) => {
                const selected = picked.has(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setPicked((prev) => {
                        const next = new Set(prev)
                        if (next.has(member.id)) next.delete(member.id)
                        else next.add(member.id)
                        return next
                      })
                    }
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-2.5 rounded-card border px-3 py-2 text-left transition-app",
                      selected
                        ? "border-primary-500 bg-primary-50"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    <Avatar name={member.name} src={member.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                      {member.name}
                    </span>
                    {selected ? (
                      <Check size={16} className="shrink-0 text-primary-600" aria-hidden />
                    ) : null}
                  </button>
                )
              })}
              {memberQuery.trim().length >= 2 && memberResults.length === 0 ? (
                <p className="text-body-sm text-slate-500">{s["chat.noMemberResults"]}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setGroupOpen(false)}>
              {s["report.cancel"]}
            </Button>
            <Button
              loading={creating}
              disabled={!groupTitle.trim() || picked.size === 0}
              onClick={handleCreateGroup}
            >
              {s["chat.createGroup"]}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
