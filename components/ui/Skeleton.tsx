// Gray placeholder blocks for loading states. Pulse animation.
import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-card bg-slate-200", className)} />
}