import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  showWordmark?: boolean
  className?: string
}

const sizeMap = {
  sm: { icon: "h-7 w-7" },
  md: { icon: "h-9 w-9" },
  lg: { icon: "h-11 w-11" },
  xl: { icon: "h-14 w-14" },
}

/**
 * Krantind icon — "Kranti" (revolution) + voice.
 * A rising, forward-leaning megaphone whose sound waves
 * become a soaring bird / flame of change.
 * Works at 16px like Instagram/Snapchat icons.
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
          <stop offset="50%" stopColor="#F7A97C" />
          <stop offset="100%" stopColor="#FFD166" />
        </linearGradient>
        <linearGradient id="krantind-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rounded app-icon tile */}
      <rect width="64" height="64" rx="14" fill="url(#krantind-bg)" />
      <rect width="64" height="64" rx="14" stroke="url(#krantind-glow)" strokeWidth="1" />

      {/* Megaphone body — forward lean = momentum */}
      <path
        d="M18 28 L36 16 L36 40 L18 52 Z"
        fill="#FFFFFF"
        transform="translate(2, 2)"
      />

      {/* Megaphone horn opening — the voice */}
      <path
        d="M36 16 L50 8 L50 48 L36 40 Z"
        fill="url(#krantind-flame)"
        transform="translate(2, 2)"
      />

      {/* Sound waves becoming a rising bird/flame — the revolution */}
      <g stroke="#ED5F2A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Wave 1 — closest */}
        <path d="M46 20 Q54 26 46 32" transform="translate(2, 2)" />
        {/* Wave 2 — rising */}
        <path d="M51 16 Q61 26 51 36" stroke="#F7A97C" strokeWidth="2" transform="translate(2, 2)" />
        {/* Wave 3 — soaring */}
        <path d="M56 12 Q68 26 56 40" stroke="#FFD166" strokeWidth="1.5" strokeOpacity="0.8" transform="translate(2, 2)" />
      </g>

      {/* Tiny spark at the tip — the spark of change */}
      <circle cx="54" cy="20" r="1.5" fill="#FFFFFF" transform="translate(2, 2)" />
    </svg>
  )
}

export function Logo({
  size = "md",
  showWordmark = false,
  className,
}: LogoProps) {
  const { icon } = sizeMap[size]

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div className={cn("relative shadow-card rounded-2xl overflow-hidden shrink-0", icon)}>
        <LogoMark className="h-full w-full" />
      </div>
      {showWordmark && (
        <span className={cn("font-display font-bold leading-tight text-primary-700 tracking-tight", size === "sm" ? "text-lg" : size === "md" ? "text-xl" : size === "lg" ? "text-2xl" : "text-3xl")}>
          Krantind
        </span>
      )}
    </div>
  )
}