"use client"

// Resolve a user by id: prefers the logged-in profile (accounts created at
// signup are always loaded), then the profiles cache hydrated from Supabase.
// If a profile isn't cached yet it's fetched once on demand; the store
// subscription re-renders this hook when the cache updates.
//
// NOTE: hooks must always be called in the same order — this effect is
// registered unconditionally, before any early return.
import { useUserStore } from "@/lib/store/useUserStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useEffect } from "react"
import type { User } from "@/lib/types"

export function useUserById(id: string | undefined | null): User | null {
  const currentUser = useAuthStore((s) => s.currentUser)
  const users = useUserStore((s) => s.users)

  // Backfill one profile on demand (e.g. comment authors not in the feed).
  // Runs only when the id changes; guarded against already-known profiles.
  useEffect(() => {
    if (!id) return
    if (currentUser?.id === id) return
    if (useUserStore.getState().users[id]) return
    useUserStore.getState().loadById(id)
  }, [id, currentUser?.id])

  if (!id) return null
  if (currentUser?.id === id) return currentUser
  return users[id] ?? null
}
