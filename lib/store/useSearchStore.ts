"use client"

// Recent searches (up to 8), persisted to localStorage.
import { create } from "zustand"

const STORAGE_KEY = "krantind_recent_searches"
const MAX_RECENT = 8

function loadStoredRecent(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : []
  } catch {
    return []
  }
}

function saveStoredRecent(items: string[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

interface SearchState {
  recent: string[]
  pushRecent: (query: string) => void
  removeRecent: (query: string) => void
  clearRecent: () => void
}

export const useSearchStore = create<SearchState>()((set) => ({
  recent: typeof window !== "undefined" ? loadStoredRecent() : [],

  pushRecent: (query) =>
    set((s) => {
      const trimmed = query.trim()
      if (!trimmed || trimmed.length < 2) return {}
      const without = s.recent.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())
      const updated = [trimmed, ...without].slice(0, MAX_RECENT)
      saveStoredRecent(updated)
      return { recent: updated }
    }),

  removeRecent: (query) =>
    set((s) => {
      const updated = s.recent.filter((q) => q.toLowerCase() !== query.toLowerCase())
      saveStoredRecent(updated)
      return { recent: updated }
    }),

  clearRecent: () => {
    saveStoredRecent([])
    set({ recent: [] })
  },
}))