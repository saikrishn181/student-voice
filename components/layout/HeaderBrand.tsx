"use client"

// HeaderBrand: Snapchat / Instagram style brand title in top header.
// Shows animated Krantind logo briefly during page load/refresh,
// then smoothly morphs into the "krantind" brand text in the exact same place.
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePostStore } from "@/lib/store/usePostStore"
import { cn } from "@/lib/utils"

export function HeaderBrand() {
  const status = usePostStore((s) => s.status)
  const isRefreshing = usePostStore((s) => s.isRefreshing)
  const [initialFlash, setInitialFlash] = useState(true)

  // Show the logo briefly on page load (Snapchat/Instagram style splash in header)
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialFlash(false)
    }, 850)
    return () => clearTimeout(timer)
  }, [])

  const isAnimating = initialFlash || isRefreshing || status === "loading"

  return (
    <Link
      href="/feed"
      className="relative flex h-9 min-w-[100px] items-center justify-center transition-all active:scale-95"
      aria-label="Krantind Home"
    >
      {/* 1. Krantind Logo (Appears during load / reload / refresh in middle top) */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out",
          isAnimating
            ? "scale-100 opacity-100 rotate-0"
            : "scale-75 opacity-0 rotate-12 pointer-events-none",
        )}
      >
        <div className="relative flex h-8 w-8 items-center justify-center">
          <div className="absolute -inset-1 rounded-xl bg-primary-500/20 animate-ping duration-1000" />
          <img
            src="/logo.png"
            alt="Krantind"
            className="h-7 w-7 rounded-xl object-cover shadow-xs select-none animate-pulse duration-700"
            draggable={false}
          />
        </div>
      </div>

      {/* 2. Krantind Text (Shows normally when idle) */}
      <span
        className={cn(
          "font-serif text-xl font-bold tracking-tight text-slate-900 lowercase transition-all duration-300 ease-out select-none",
          isAnimating
            ? "scale-75 opacity-0 -translate-y-1"
            : "scale-100 opacity-100 translate-y-0",
        )}
      >
        krantind
      </span>
    </Link>
  )
}
