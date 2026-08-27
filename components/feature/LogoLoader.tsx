"use client"

import { cn } from "@/lib/utils"

interface LogoLoaderProps {
  size?: "sm" | "md" | "lg"
  label?: string
  className?: string
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
}

export function LogoLoader({ size = "md", label, className }: LogoLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 p-4", className)}>
      <div className="relative flex items-center justify-center">
        {/* Glowing pulse ring */}
        <div className="absolute -inset-1.5 animate-ping rounded-2xl bg-primary-500/20 duration-1000" />
        
        {/* Rotating subtle halo */}
        <div className="absolute -inset-1 animate-spin rounded-2xl bg-linear-to-tr from-primary-600 via-amber-500 to-primary-800 opacity-40 blur-xs duration-1000" />
        
        {/* Actual Krantind Logo */}
        <div
          className={cn(
            "relative z-10 overflow-hidden rounded-2xl shadow-card bg-black transition-transform active:scale-95",
            sizeMap[size],
          )}
        >
          <img
            src="/logo.png"
            alt="Krantind"
            className="h-full w-full object-cover select-none animate-pulse duration-1000"
            draggable={false}
          />
        </div>
      </div>

      {label ? (
        <span className="text-xs font-semibold tracking-wide text-slate-500 animate-pulse">
          {label}
        </span>
      ) : null}
    </div>
  )
}
