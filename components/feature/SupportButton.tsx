"use client"

// Support button: ghost variant, shows live count, toggles filled/outline icon
// state by calling toggleSupport on the post store. Small scale-up animation on
// click via a transient active class. Disabled while a toggle is in flight to
// avoid double-count races.
import { useState } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import { cn, compactNumber } from "@/lib/utils"

export function SupportButton({ postId }: { postId: string }) {
  const post = usePostStore((s) => s.posts.find((p) => p.id === postId))
  const toggleSupport = usePostStore((s) => s.toggleSupport)
  const locked = usePostStore((s) => Boolean(s.supportLocks[postId]))
  const currentUser = useAuthStore((s) => s.currentUser)
  const showToast = useToastStore((s) => s.show)
  const [bump, setBump] = useState(false)

  if (!post) return null

  const supported = post.supportedByCurrentUser

  const handleClick = async () => {
    if (!currentUser || locked) return
    try {
      await toggleSupport(postId, currentUser.id)
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setBump(true)
        window.setTimeout(() => setBump(false), 200)
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : s["validation.generic"], "error")
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={locked}
      aria-pressed={supported}
      aria-label={supported ? s["support.button.remove"] : s["support.button.support"]}
      className={cn(
        "group flex items-center gap-2 text-[14px] font-medium transition-app",
        supported ? "text-accent-600" : "text-slate-500 hover:text-accent-600",
        bump && "scale-110",
      )}
    >
      <div className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
        supported ? "bg-accent-50" : "group-hover:bg-accent-50"
      )}>
        <Heart
          size={18}
          fill={supported ? "currentColor" : "none"}
          className="transition-transform group-hover:scale-110"
          aria-hidden
        />
      </div>
      <span>{post.supportCount > 0 ? compactNumber(post.supportCount) : ''}</span>
    </button>
  )
}