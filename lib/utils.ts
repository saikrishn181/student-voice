// General-purpose helper functions shared across the app.

import type { ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge conditional Tailwind classes safely.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate the first two initials from a person's name (for Avatar fallback).
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ""
  return (first + last).toUpperCase()
}

// Deterministic pseudo-random small string for mock ids.
export function mockId(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

// Simulate async latency for mocked logins / lookups. A real Supabase call will
// replace these functions in a later phase.
export function fakeDelay(ms = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Clamp a value between min and max.
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}