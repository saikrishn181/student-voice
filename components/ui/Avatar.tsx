"use client"

// Circular avatar with initials fallback. Uses native img with error fallback for reliable cross-device display.
import { useState, useEffect } from "react"
import { cn, initialsOf } from "@/lib/utils"

type Size = "sm" | "md" | "lg"

const sizeMap: Record<Size, number> = {
  sm: 40,
  md: 56,
  lg: 80,
}

interface AvatarProps {
  name: string
  src?: string | null
  size?: Size
  className?: string
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const px = sizeMap[size]
  const [imgError, setImgError] = useState(false)

  // Reset error state whenever the source URL changes
  useEffect(() => {
    setImgError(false)
  }, [src])

  const validSrc =
    src &&
    typeof src === "string" &&
    src.trim() !== "" &&
    src.trim() !== "null" &&
    src.trim() !== "undefined"
      ? src.trim()
      : null

  if (validSrc && !imgError) {
    return (
      <span
        className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full bg-slate-100", className)}
        style={{ width: px, height: px }}
      >
        <img
          src={validSrc}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700",
        className,
      )}
      style={{ width: px, height: px, fontSize: px * 0.4 }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  )
}