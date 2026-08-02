// Small pill label. Reused for CategoryTag, RegionTag, VerifiedBadge, etc.
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type BadgeTone = "neutral" | "primary" | "accent" | "success" | "danger"

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  primary: "bg-primary-50 text-primary-700",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-green-100 text-green-800",
  danger: "bg-red-100 text-red-700",
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}