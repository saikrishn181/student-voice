"use client"

// Support button: ghost variant, shows live count, toggles filled/outline icon
// state by calling toggleSupport on the post store. Small scale-up animation on
// click via a transient active class.
import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePostStore } from "@/lib/store/usePostStore"
import { cn, compactNumber } from "@/lib/utils"

export function SupportButton({ postId }: { postId: string }) {
  const post = usePostStore((s) => s.posts.find((p) => p.id === postId))
  const toggleSupport = usePostStore((s) => s.toggleSupport)
  const [bump, setBump] = useState(false)

  if (!post) return null

  const supported = post.supportedByCurrentUser

  const handleClick = () => {
    toggleSupport(postId)
    setBump(true)
    window.setTimeout(() => setBump(false), 200)
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      aria-pressed={supported}
      aria-label={supported ? "Remove support" : "Support this post"}
      className={cn(
        "gap-1.5 px-3",
        supported ? "text-accent-600" : "text-slate-500",
        bump && "scale-110",
      )}
    >
      <Heart size={18} fill={supported ? "currentColor" : "none"} aria-hidden />
      {compactNumber(post.supportCount)}
    </Button>
  )
}