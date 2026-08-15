// Base card container for post cards, profile cards, etc.

import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
}

export function Card({ children, className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "surface-card p-4 sm:p-5",
        interactive && "transition-app cursor-pointer hover:shadow-lift hover:-translate-y-0.5",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}