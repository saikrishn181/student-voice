import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showWordmark?: boolean
  className?: string
  priority?: boolean
}

const sizeMap = {
  sm: { icon: "h-8 w-8", text: "text-base", sub: "text-[10px]" },
  md: { icon: "h-10 w-10", text: "text-lg", sub: "text-xs" },
  lg: { icon: "h-12 w-12", text: "text-xl", sub: "text-xs" },
  xl: { icon: "h-16 w-16", text: "text-2xl", sub: "text-sm" },
}

/**
 * Krantind custom emblem:
 * Represents "Kranti" (revolution / voice) + "Ind" (India) —
 * A bold 'K' monogram fusing a megaphone/torch with acoustic broadcast ripples.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="krantind-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1F4E78" />
          <stop offset="100%" stopColor="#12304B" />
        </linearGradient>
        <linearGradient id="krantind-flame" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ED5F2A" />
          <stop offset="100%" stopColor="#F7A97C" />
        </linearGradient>
        <linearGradient id="krantind-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded tile backdrop */}
      <rect width="64" height="64" rx="16" fill="url(#krantind-bg)" />
      <rect width="64" height="64" rx="16" stroke="url(#krantind-glow)" strokeWidth="1.5" />

      {/* 'K' Pillar (Solid student pillar) */}
      <rect x="14" y="14" width="7" height="36" rx="3.5" fill="#FFFFFF" />

      {/* Lower 'K' leg (Grounding stroke / forward action) */}
      <path
        d="M21 34L37 50"
        stroke="#FFFFFF"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Upper 'K' arm + Megaphone Horn (The voice / spark of Kranti) */}
      <path
        d="M21 30L38 17.5V36.5L21 30Z"
        fill="url(#krantind-flame)"
      />

      {/* Center flame/voice accent pip */}
      <circle cx="27" cy="30.5" r="2" fill="#FFFFFF" />

      {/* Broadcast Soundwave 1 */}
      <path
        d="M43 21C45.5 24 45.5 30 43 33"
        stroke="#ED5F2A"
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Broadcast Soundwave 2 (Outer ripple) */}
      <path
        d="M48.5 17C52.5 21.5 52.5 32.5 48.5 37"
        stroke="#F7A97C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  )
}

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: LogoProps) {
  const { icon, text } = sizeMap[size]

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div className={cn("relative shadow-card rounded-2xl overflow-hidden shrink-0", icon)}>
        <LogoMark className="h-full w-full" />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold leading-tight text-primary-700 tracking-tight", text)}>
          Krantind
        </span>
      )}
    </div>
  )
}
