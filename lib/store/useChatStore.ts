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
  created_at: string
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
  }
}

interface ChatState {
  conversations: Conversation[]
  messagesByConversation: Record<string, Message[]>
  conversationsLoaded: boolean
  realtimeChannel: ReturnType<ReturnType<typeof createSupabaseBrowserClient>["channel"]> | null

  loadConversations: () => Promise<void>
  // Find-or-create the 1:1 conversation with another user; returns its id.
  getOrCreateConversation: (otherUserId: string) => Promise<string | null>
  loadMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: string) => Promise<boolean>
  startRealtime: () => void
  stopRealtime: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  conversationsLoaded: false,
  realtimeChannel: null,

  loadConversations: async () => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return

    // 1. All conversations I'm part of.
    const { data: memberships, error: mError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", currentUserId)
    if (mError || !memberships) return

    const conversationIds = memberships.map((m) => m.conversation_id)
    if (conversationIds.length === 0) {
      set({ conversations: [], conversationsLoaded: true })
      return
    }

    // 2. The other participant per conversation.
    const { data: participants, error: pError } = await supabase
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", currentUserId)
    if (pError || !participants) return

    // 3. Most recent message per conversation (for the preview line).
    const { data: messageRows, error: msgError } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
    if (msgError || !messageRows) return

    const lastByConv = new Map<string, MessageRow>()
    for (const row of messageRows) {
      if (!lastByConv.has(row.conversation_id)) lastByConv.set(row.conversation_id, row)
    }

    const otherByConv = new Map<string, string>()
    for (const p of participants) otherByConv.set(p.conversation_id, p.user_id)

    const { data: conversationRows } = await supabase
      .from("conversations")
      .select("id, created_at")
      .in("id", conversationIds)

    const conversations: Conversation[] = (conversationRows ?? [])
      .map((c) => ({
        id: c.id,
        otherUserId: otherByConv.get(c.id) ?? "",
        createdAt: c.created_at,
      }))
      .filter((c) => c.otherUserId)

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
        const currentUser = useAuthStore.getState().currentUser
        for (const row of partnerRows) {
          const user = {
            id: row.id,
            name: row.name,
            email: row.name,
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

    set((s) => ({
      conversations,
      conversationsLoaded: true,
      messagesByConversation: { ...s.messagesByConversation, ...previewMap },
    }))
  },

  getOrCreateConversation: async (otherUserId) => {
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId || otherUserId === currentUserId) return null

    const { data, error } = await supabase.rpc("get_or_create_conversation", {
      p_other: otherUserId,
    })
    if (error) return null

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
    if (error || !data) return
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: (data as MessageRow[]).map(rowToMessage),
      },
    }))
  },

  sendMessage: async (conversationId, content) => {
    const trimmed = content.trim()
    if (!trimmed) return false
    const supabase = createSupabaseBrowserClient()
    const currentUserId = useAuthStore.getState().currentUser?.id
    if (!currentUserId) return false

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
    })
    if (error) return false

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
            // Refresh the conversation list so ordering/preview update.
            get().loadConversations()
          }
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