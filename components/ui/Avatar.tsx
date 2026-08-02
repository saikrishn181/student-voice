"use client"

// Circular avatar with initials fallback. Uses next/image for the image.
import Image from "next/image"
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

  if (src) {
    return (
      <span
        className={cn("relative inline-flex shrink-0 overflow-hidden rounded-full", className)}
        style={{ width: px, height: px }}
      >
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${px}px`}
          className="object-cover"
          unoptimized
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