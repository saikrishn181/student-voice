// Wraps page content: full-width with padding on mobile, centered + max-width
// on large screens. All pages that render inside the logged-in shell use this.
import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function ResponsiveContainer({
  children,
  className,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8", className)}
      {...props}
    >
      {children}
    </div>
  )
}