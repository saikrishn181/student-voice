"use client"

// Notifications store backed by the Supabase `notifications` table.
// Notifications are created by DB triggers (on support / comment / follow),
// so this store only reads + toggles `read` state. A realtime subscription
// keeps the badge fresh while the app is open, with a 60s polling fallback.
import { create } from "zustand"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Notification, NotificationType } from "@/lib/types"

interface NotificationRow {
  id: string
  user_id: string
  type: NotificationType
  actor_id: string
  post_id: string | null
  read: boolean
  created_at: string
}

function rowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    actorId: row.actor_id,
    postId: row.post_id ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  }
}

interface NotificationState {
  notifications: Notification[]
  status: "idle" | "loading" | "ready" | "error"
  // Per-type mute + digest frequency, stored in `notification_preferences`.
  // Muted types are filtered client-side on load and on live inserts.
  preferences: { mutedTypes: string[]; digestFrequency: "instant" | "daily" | "never" } | null

  load: (userId: string) => Promise<void>
  loadPreferences: (userId: string) => Promise<void>
  updatePreferences: (
    userId: string,
    patch: {
      mutedTypes?: string[]
      digestFrequency?: "instant" | "daily" | "never"
    },
  ) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  // Live sync: realtime subscription + polling fallback so the unread badge
  // never goes stale while the app is open.
  startRealtime: (userId: string) => void
  stopRealtime: () => void
  realtimeChannel: RealtimeChannel | null
  pollTimer: ReturnType<typeof setInterval> | null
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  status: "idle",
  preferences: null,
  realtimeChannel: null,
  pollTimer: null,

  load: async (userId) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) {
      set({ status: "error" })
      return
    }
    const muted = new Set(get().preferences?.mutedTypes ?? [])
    const notifications = (data ?? [])
      .filter((row) => !muted.has((row as NotificationRow).type))
      .map((row) => rowToNotification(row as Parameters<typeof rowToNotification>[0]))
    set({ notifications, status: "ready" })
  },

  loadPreferences: async (userId) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("notification_preferences")
      .select("muted_types, digest_frequency")
      .eq("user_id", userId)
      .maybeSingle()
    if (error) return
    set({
      preferences: {
        mutedTypes: (data?.muted_types as string[] | null) ?? [],
        digestFrequency: (data?.digest_frequency as "instant" | "daily" | "never" | null) ?? "daily",
      },
    })
  },

  updatePreferences: async (userId, patch) => {
    const prev = get().preferences
    const next = {
      mutedTypes: patch.mutedTypes ?? prev?.mutedTypes ?? [],
      digestFrequency: patch.digestFrequency ?? prev?.digestFrequency ?? "daily",
    }
    // Optimistic.
    set({ preferences: next })
    const supabase = createSupabaseBrowserClient()
    await supabase
      .from("notification_preferences")
      .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    // Reload so the badge/list reflect the new mute set immediately.
    if (userId) void get().load(userId)
  },

  markAsRead: async (id) => {
    // Optimistic.
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }))
    const supabase = createSupabaseBrowserClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
  },

markAllAsRead: async () => {
    const unreadIds = get().notifications.filter((n) => !n.read).map((n) => n.id)
    // Optimistic.
    set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
    if (unreadIds.length === 0) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
  },

  startRealtime: (userId) => {
    const { realtimeChannel, pollTimer } = get()
    if (realtimeChannel) return
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow
          if (!row?.id) return
          const muted = new Set(get().preferences?.mutedTypes ?? [])
          if (muted.has(row.type)) return
          set((s) => ({
            notifications: [rowToNotification(row), ...s.notifications].slice(0, 50),
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

    // Polling fallback in case realtime is disabled on the project.
    if (!pollTimer) {
      const timer = setInterval(() => {
        void get().load(userId)
      }, 60_000)
      set({ pollTimer: timer })
    }
  },

  stopRealtime: () => {
    const { realtimeChannel, pollTimer } = get()
    const supabase = createSupabaseBrowserClient()
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      set({ realtimeChannel: null })
    }
    if (pollTimer) {
      clearInterval(pollTimer)
      set({ pollTimer: null })
    }
  },
}))