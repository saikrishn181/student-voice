"use client"

// Chat store: 1:1 conversations + messages backed by Supabase, with realtime
// subscriptions for live messages. Conversations are created lazily via the
// get_or_create_conversation RPC (find-or-create the 1:1 thread with another
// user). RLS restricts everything to conversation participants.
import { create } from "zustand"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Conversation, Message } from "@/lib/types"
import { useAuthStore } from "./useAuthStore"
import { useUserStore } from "./useUserStore"

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  attachment_url: string | null
  attachment_type: "photo" | "video" | null
  created_at: string
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentType: row.attachment_type ?? undefined,
  }
}

interface TypingRow {
  conversation_id: string
  user_id: string
  updated_at: string
}

interface ChatState {
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  conversationsLoaded: boolean
  realtimeChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null
  // Unread incoming-message counts per conversation (0 when not tracked).
  unreadByConversation: Record<string, number>
  // Conversation currently open in the thread page (badges pause for it).
  activeConversationId: string | null
  // Who is typing per conversation: user_id -> when they last pinged.
  typingByConversation: Record<string, Record<string, number>>
  // Other participants' latest read timestamp per conversation (receipts).
  otherLastReadByConversation: Record<string, string>
  // Group member count per conversation (for headers/labels).
  memberCountByConversation: Record<string, number>

  // true = loaded OK, false = query failed (callers can show a retry UI).
  loadConversations: () => Promise<boolean>
  // Find-or-create the 1:1 conversation with another user; returns its id.
  getOrCreateConversation: (otherUserId: string) => Promise<string | null>
  // Create a group conversation; returns its id.
  createGroupConversation: (title: string, memberIds: string[]) => Promise<string | null>
  loadMessages: (conversationId: string) => Promise<boolean>
  // Throws an Error with a human-readable message on failure (callers toast it).
  sendMessage: (conversationId: string, content: string, attachment?: { url: string; type: "photo" | "video" }) => Promise<boolean>
  // Marks the open conversation as read (badge zeroed + DB read receipts).
  markConversationRead: (conversationId: string) => Promise<void>
  setActiveConversation: (conversationId: string | null) => void
  // Announce "currently typing" (throttled server-side by the caller) or clear it.
  setTyping: (conversationId: string, typing: boolean) => void
  startRealtime: () => void
  stopRealtime: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  conversationsLoaded: false,
  realtimeChannel: null,
  unreadByConversation: {},
  activeConversationId: null,
  typingByConversation: {},
  otherLastReadByConversation: {},
  memberCountByConversation: {},

  loadConversations: async () => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) {
      set({ conversations: [], conversationsLoaded: true })
      return false
    }

    // 1. All conversations I'm part of.
    const { data: memberships, error: mError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId)
    if (mError || !memberships) {
      set({ conversationsLoaded: true })
      return false
    }

    const conversationIds = memberships.map((m) => m.conversation_id)
    if (conversationIds.length === 0) {
      set({ conversations: [], conversationsLoaded: true })
      return true
    }

    // 2. Participants + my read-state per conversation. The last_read_at column
    // only exists after the chat-unread migration; if it's missing we retry
    // without it so the inbox still works (badges just stay off).
    let participantRows: { conversation_id: string; user_id: string; last_read_at: string | null }[] | null = null
    let pError: { message?: string } | null = null
    const participantQuery = supabase
      .from("conversation_participants")
      .select("conversation_id, user_id, last_read_at")
      .in("conversation_id", conversationIds)
    ;({ data: participantRows, error: pError } = await participantQuery)
    if ((pError || !participantRows) && pError?.message?.toLowerCase().includes("last_read_at")) {
      const { data, error } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds)
      participantRows = (data ?? []).map((r) => ({ ...r, last_read_at: null }))
      pError = error
    }
    if (pError || !participantRows) {
      set({ conversationsLoaded: true })
      return false
    }

    const myReadByConv = new Map<string, string | null>()
    const otherReadByConv = new Map<string, string>()
    const memberCountByConv = new Map<string, number>()
    for (const p of participantRows) {
      const count = (memberCountByConv.get(p.conversation_id) ?? 0) + 1
      memberCountByConv.set(p.conversation_id, count)
      if (p.user_id === currentUserId) myReadByConv.set(p.conversation_id, p.last_read_at)
    }
    for (const p of participantRows) {
      if (p.user_id === currentUserId) continue
      if (!otherByConv.has(p.conversation_id)) otherByConv.set(p.conversation_id, p.user_id)
      const existing = otherReadByConv.get(p.conversation_id)
      if (p.last_read_at && (!existing || new Date(p.last_read_at) > new Date(existing))) {
        otherReadByConv.set(p.conversation_id, p.last_read_at)
      }
    }

    // 3. Most recent message per conversation (for the preview line).
    const { data: messageRows, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
    if (msgError || !messageRows) {
      set({ conversationsLoaded: true })
      return false
    }

    const lastByConv = new Map<string, MessageRow>()
    for (const row of messageRows) {
      if (!lastByConv.has(row.conversation_id)) lastByConv.set(row.conversation_id, row)
    }

    // Unread = incoming messages newer than my last_read_at. A NULL last_read_at
    // (fresh migration / never opened) counts as "all read" to avoid fake badges.
    const unreadByConversation: Record<string, number> = {}
    if (myReadByConv.size > 0) {
      for (const row of messageRows) {
        if (row.sender_id === currentUserId) continue
        const lastRead = myReadByConv.get(row.conversation_id)
        if (lastRead && new Date(row.created_at) > new Date(lastRead)) {
          unreadByConversation[row.conversation_id] =
            (unreadByConversation[row.conversation_id] ?? 0) + 1
        }
      }
    }

    const { data: conversationRows } = await supabase
      .from("conversations")
      .select("id, title, is_group, created_at")
      .in("id", conversationIds)

    const conversations: Conversation[] = (conversationRows ?? [])
      .map((c) => ({
        id: c.id,
        otherUserId: otherByConv.get(c.id) ?? "",
        createdAt: c.created_at,
        title: c.title ?? undefined,
        isGroup: c.is_group ?? false,
      }))
      .filter((c) => c.isGroup || c.otherUserId)

    conversations.sort((a, b) => {
      const aLast = lastByConv.get(a.id)?.created_at ?? a.createdAt
      const bLast = lastByConv.get(b.id)?.created_at ?? b.createdAt
      return new Date(bLast).getTime() - new Date(aLast).getTime()
    })

    // Seed the inbox preview: store the latest message per conversation so the
    // list page can render a "last message" line without a second query.
    const previewMap: Record<string, Message[]> = {}
    for (const [convId, row] of lastByConv) {
      previewMap[convId] = [rowToMessage(row)]
    }

    // Preload avatars/names for conversation partners.
    const otherIds = conversations.map((c) => c.otherUserId)
    if (otherIds.length > 0) {
      const { data: partnerRows } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .in("id", otherIds)
      if (partnerRows) {
        for (const row of partnerRows) {
          const existing = useUserStore.getState().users[row.id]
          if (!existing) {
            const user = {
              id: row.id,
              name: row.name,
              email: "",
              accountType: "student" as const,
              followerCount: 0,
              followingCount: 0,
              createdAt: new Date().toISOString(),
              isAdmin: false,
              avatarUrl: row.avatar_url ?? undefined,
            }
            useUserStore.setState((s) => ({
              users: { ...s.users, [row.id]: user },
            }))
          }
        }
      }
    }

    set((s) => ({
      conversations,
      conversationsLoaded: true,
      unreadByConversation,
      otherLastReadByConversation: Object.fromEntries(otherReadByConv),
      memberCountByConversation: Object.fromEntries(memberCountByConv),
      messagesByConversation: { ...s.messagesByConversation, ...previewMap },
    }))
    return true
  },

  createGroupConversation: async (title, memberIds) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId || memberIds.length === 0) return null
    const { data, error } = await supabase.rpc("create_group_conversation", {
      p_title: title.trim(),
      p_member_ids: memberIds,
    })
    if (error) {
      if (error.message.includes("EMPTY_TITLE")) {
        throw new Error("Give the group a name.")
      }
      if (error.message.includes("NO_MEMBERS")) {
        throw new Error("Pick at least one member for the group.")
      }
      throw new Error("Could not create the group — please try again.")
    }
    await get().loadConversations()
    return typeof data === "string" ? data : null
  },

  getOrCreateConversation: async (otherUserId) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId || otherUserId === currentUserId) return null

    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      p_other: otherUserId,
    })
    if (error) {
      // Private accounts reject non-followers at the DB layer.
      if (error.message.includes("PRIVATE_ACCOUNT_NOT_ALLOWED")) {
        throw new Error("This account is private — follow them first to send a message.")
      }
      throw new Error("Could not start a conversation — please try again.")
    }

    await get().loadConversations()
    return typeof data === "string" ? data : null
  },

  loadMessages: async (conversationId) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200)
    if (error || !data) return false
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: (data as MessageRow[]).map(rowToMessage),
      },
    }))
    return true
  },

  sendMessage: async (conversationId, content, attachment) => {
    const trimmed = content.trim()
    if (!trimmed && !attachment) return false
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) {
      throw new Error("You need to be logged in to send messages.")
    }

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
      attachment_url: attachment?.url ?? null,
      attachment_type: attachment?.type ?? null,
    })
    if (error) {
      throw new Error(chatErrorMessage(error.message))
    }

    // Optimistic append; realtime will dedupe by id.
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(1)
    const newest = (data as MessageRow[] | null)?.[0]
    if (newest && !get().messagesByConversation[conversationId]?.some((m) => m.id === newest.id)) {
      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: [...(s.messagesByConversation[conversationId] ?? []), rowToMessage(newest)],
        },
      }))
    }
    return true
  },

  markConversationRead: async (conversationId) => {
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return
    set((s) => ({
      activeConversationId: conversationId,
      unreadByConversation: { ...s.unreadByConversation, [conversationId]: 0 },
    }))
    const supabase = createSupabaseBrowserClient()
    // DB marks incoming messages read + bumps last_read_at (chat-v2 RPC).
    // No-op until the chat-v2 migration is applied.
    const { error } = await supabase.rpc("mark_messages_read", {
      p_conversation: conversationId,
    })
    if (!error) {
      // Read receipts: my sent messages are now "read" for the other side too —
      // mark them locally so the UI reflects it without waiting for realtime.
      const me = useAuthStore.getState().currentUser?.id
      set((s) => ({
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: (s.messagesByConversation[conversationId] ?? []).map((m) =>
            m.senderId === me ? { ...m, readAt: new Date().toISOString() } : m,
          ),
        },
      }))
    }
  },

  setTyping: (conversationId, typing) => {
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return
    const supabase = createSupabaseBrowserClient()
    if (typing) {
      void supabase.from("chat_typing").upsert(
        { conversation_id: conversationId, user_id: currentUserId, updated_at: new Date().toISOString() },
        { onConflict: "conversation_id,user_id" },
      )
    } else {
      void supabase
        .from("chat_typing")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("user_id", currentUserId)
    }
  },

  setActiveConversation: (conversationId) =>
    set((s) => ({
      activeConversationId: conversationId,
      unreadByConversation: conversationId
        ? { ...s.unreadByConversation, [conversationId]: 0 }
        : s.unreadByConversation,
    })),

  startRealtime: () => {
    const { realtimeChannel } = get()
    if (realtimeChannel) return
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const row = payload.new as MessageRow
          if (!row?.id) return
          const convId = row.conversation_id
          const existing = get().messagesByConversation[convId] ?? []
          if (!existing.some((m) => m.id === row.id)) {
            set((s) => ({
              messagesByConversation: {
                ...s.messagesByConversation,
                [convId]: [...existing, rowToMessage(row)],
              },
            }))
            // Unread badge: incoming messages count up unless this conversation
            // is open right now (the thread page marks it read instead).
            const me = useAuthStore.getState().currentUser?.id
            if (row.sender_id !== me) {
              if (get().activeConversationId === convId) {
                void get().markConversationRead(convId)
              } else {
                set((s) => ({
                  unreadByConversation: {
                    ...s.unreadByConversation,
                    [convId]: (s.unreadByConversation[convId] ?? 0) + 1,
                  },
                }))
              }
            }
            // Refresh the conversation list so ordering/preview update.
            get().loadConversations()
          }
        },
      )
      // Typing pings: INSERT/UPDATE refresh the "typing since" timestamp.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_typing" },
        (payload) => {
          const row = payload.new as TypingRow
          if (!row?.conversation_id || !row.user_id) return
          if (row.user_id === useAuthStore.getState().currentUser?.id) return
          set((s) => ({
            typingByConversation: {
              ...s.typingByConversation,
              [row.conversation_id]: {
                ...(s.typingByConversation[row.conversation_id] ?? {}),
                [row.user_id]: Date.now(),
              },
            },
          }))
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_typing" },
        (payload) => {
          const row = payload.new as TypingRow
          if (!row?.conversation_id || !row.user_id) return
          if (row.user_id === useAuthStore.getState().currentUser?.id) return
          set((s) => ({
            typingByConversation: {
              ...s.typingByConversation,
              [row.conversation_id]: {
                ...(s.typingByConversation[row.conversation_id] ?? {}),
                [row.user_id]: Date.now(),
              },
            },
          }))
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_typing" },
        (payload) => {
          const old = payload.old as { conversation_id?: string; user_id?: string }
          if (!old?.conversation_id || !old.user_id) return
          set((s) => {
            const map = { ...(s.typingByConversation[old.conversation_id] ?? {}) }
            delete map[old.user_id]
            return { typingByConversation: { ...s.typingByConversation, [old.conversation_id]: map } }
          })
        },
      )
      // Read receipts: the other participant bumped last_read_at.
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversation_participants" },
        (payload) => {
          const row = payload.new as {
            conversation_id: string
            user_id: string
            last_read_at: string | null
          }
          const me = useAuthStore.getState().currentUser?.id
          if (!row?.conversation_id || !row.last_read_at || row.user_id === me) return
          const existing = get().otherLastReadByConversation[row.conversation_id]
          if (existing && new Date(row.last_read_at) <= new Date(existing)) return
          set((s) => ({
            otherLastReadByConversation: {
              ...s.otherLastReadByConversation,
              [row.conversation_id]: row.last_read_at,
            },
          }))
        },
      )

    set({ realtimeChannel: channel })
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED") {
        set({ realtimeChannel: null })
        supabase.removeChannel(channel)
      }
    })
  },

  stopRealtime: () => {
    const { realtimeChannel } = get()
    if (!realtimeChannel) return
    const supabase = createSupabaseBrowserClient()
    supabase.removeChannel(realtimeChannel)
    set({ realtimeChannel: null })
  },
}))

// Map raw Supabase/Postgres errors from message inserts to friendly copy.
function chatErrorMessage(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("row-level security") || m.includes("policy")) {
    return "You can't send messages in this conversation."
  }
  if (m.includes("could not find the table") || m.includes("not exist")) {
    return "Chat isn't ready yet — re-run the upgrade SQL script."
  }
  if (m.includes("char_length") || m.includes("too long")) {
    return "Message is too long (max 2000 characters)."
  }
  if (m.includes("connection")) {
    return "No internet connection — check your network and try again."
  }
  return "Could not send the message — please try again."
}