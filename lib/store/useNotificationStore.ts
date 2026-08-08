"use client"

// Notifications store backed by the Supabase `notifications` table.
// Notifications are created by DB triggers (on support / comment / follow),
// so this store only reads + toggles `read` state.
import { create } from "zustand"

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

  load: (userId: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>()((set, get) => ({
  notifications: [],
  status: "idle",

  load: async (userId) => {
    const supabase = createSupabaseBrowserClient()
    set({ status: "loading" })
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
    set({
      notifications: (data ?? []).map((row) =>
        rowToNotification(row as Parameters<typeof rowToNotification>[0]),
      ),
      status: "ready",
    })
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
}))