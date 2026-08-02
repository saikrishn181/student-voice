// Small semantic tags built on the base Badge pill component.
import { BadgeCheck, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/Badge"
import { cn } from "@/lib/utils"

// Shown next to a user's name when the author is a verified organization.
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <Badge tone="primary" className={className}>
      <BadgeCheck size={14} aria-hidden />
      Verified
    </Badge>
  )
}

// RegionTag — a "district, state" pill for a post's location.
export function RegionTag({
  state,
  district,
  className,
}: {
  state: string
  district: string
  className?: string
}) {
  return (
    <Badge tone="neutral" className={className}>
      <MapPin size={13} aria-hidden />
      {district}, {state}
    </Badge>
  )
}

// CategoryTag — pill for the post's category.
export function CategoryTag({ category, className }: { category: string; className?: string }) {
  return (
    <Badge tone="accent" className={cn("uppercase tracking-wide", className)}>
      {category}
    </Badge>
  )
}