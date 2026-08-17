"use client"

// Global toast notifications. Lightweight store so any page/component can emit
// a toast without prop-drilling. The <Toaster /> component reads from here.
import { create } from "zustand"
import type { ToastKind } from "@/lib/types"

export interface ToastItem {
  id: string
  message: string
  kind: ToastKind
}

interface ToastState {
  toasts: ToastItem[]
  show: (message: string, kind?: ToastKind) => void
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  show: (message, kind = "info") => {
    const id = `toast_${++counter}`
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }))
    // Auto-dismiss after a few seconds.
    if (typeof window !== "undefined") {
      window.setTimeout(() => get().dismiss(id), 3500)
    }
  },

  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Convenience shorthands so pages can do `toast.success("...")`.
export const toast = {
  success: (m: string) => useToastStore.getState().show(m, "success"),
  error: (m: string) => useToastStore.getState().show(m, "error"),
  info: (m: string) => useToastStore.getState().show(m, "info"),
}