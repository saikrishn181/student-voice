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
 * A flame of change on a black tile — the revolution burning bright.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn("shrink-0 select-none object-cover", className)}
    />
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