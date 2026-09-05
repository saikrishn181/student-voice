"use client"

// Lightweight cache of public profiles, keyed by id. The post store seeds it
// (posts include author ids), and other pages can refresh a single profile.
// This keeps `useUserById` synchronous while still backing it by Supabase.
import { create } from "zustand"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { Profile, User } from "@/lib/types"
import { rowToUser } from "@/lib/mappers"
export { rowToUser }

interface UserState {
  users: Record<string, User>
  loadAll: () => Promise<User[]>
  loadById: (id: string) => Promise<User | null>
  // Batch-load many profile ids in one query (followers/following lists).
  loadMany: (ids: string[]) => Promise<void>
}

export const useUserStore = create<UserState>()((set, get) => ({
  users: {},

  loadAll: async () => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("follower_count", { ascending: false })
    if (error || !data) return []
    const users = data.map((row) => rowToUser(row as Profile))
    set((s) => ({
      users: { ...s.users, ...Object.fromEntries(users.map((u) => [u.id, u])) },
    }))
    return users
  },

  loadById: async (id) => {
    if (!id || id === "anonymous") return null
    const cached = get().users[id]
    if (cached) return cached
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle()
    if (error || !data) return null
    const user = rowToUser(data as Profile)
    set((s) => ({ users: { ...s.users, [id]: user } }))
    return user
  },

  loadMany: async (ids) => {
    const missing = [...new Set(ids)].filter((id) => id && id !== "anonymous" && !get().users[id])
    if (missing.length === 0) return
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .in("id", missing)
    if (error || !data) return
    const users = data.map((row) => rowToUser(row as Profile))
    set((s) => ({
      users: { ...s.users, ...Object.fromEntries(users.map((u) => [u.id, u])) },
    }))
  },
}))