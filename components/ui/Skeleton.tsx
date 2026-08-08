// Gray placeholder blocks for loading states. Pulse animation is disabled
// for users who prefer reduced motion.
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-card bg-slate-200 motion-safe:animate-pulse", className)}
      aria-hidden
    />
  )
}