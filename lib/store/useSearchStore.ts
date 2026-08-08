"use client"

// Recent searches (last 5), kept in memory only — not persisted. A real
// implementation would persist to localStorage or Supabase.
import { create } from "zustand"

const MAX_RECENT = 5

interface SearchState {
  recent: string[]
  pushRecent: (query: string) => void
  clearRecent: () => void
}

export const useSearchStore = create<SearchState>()((set) => ({
  recent: ["hostel wifi", "placement deadline", "mess food"],

  pushRecent: (query) =>
    set((s) => {
      const trimmed = query.trim()
      if (!trimmed) return {}
      const without = s.recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())
      return { recent: [trimmed, ...without].slice(0, MAX_RECENT) }
    }),

  clearRecent: () => set({ recent: [] }),
}))