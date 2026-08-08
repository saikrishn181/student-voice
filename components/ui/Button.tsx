"use client"

// Accessible, themeable button. Reused by every phase.
//
// min-h uses 44px on small screens (comfortable tap target), so we pass a
// size-aware class. loading replaces the label with a centered <Spinner />.
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "./Spinner"

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  // Renders an icon before the label (lucide icon element).
  leftIcon?: ReactNode
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900 focus-visible:ring-primary-500",
  secondary:
    "bg-primary-50 text-primary-700 hover:bg-primary-100 active:bg-primary-200 focus-visible:ring-primary-400",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-primary-500",
  danger:
    "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-400",
  ghost:
    "bg-transparent text-gray-600 hover:bg-slate-100 text-gray-800 focus-visible:ring-primary-400",
}

// Tap-target: sm keeps a compact chip on desktop, 44px minimum on mobile touch.
const sizeClasses: Record<Size, string> = {
  sm: "h-11 min-h-11 sm:h-9 sm:min-h-0 px-3 text-sm",
  md: "h-11 px-5 text-sm", // h-11 = 44px on mobile
  lg: "h-12 px-6 text-base", // 48px, comfortable on mobile
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  leftIcon,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "transition-app inline-flex items-center justify-center gap-2 rounded-card font-semibold",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size={18} />
      ) : (
        <>
          {leftIcon}
          {children}
        </>
      )}
    </button>
  )
}