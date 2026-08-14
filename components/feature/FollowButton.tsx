"use client"

// Follow / Following toggle button, wired to the post store's follow list so
// the state reflects live updates. Disabled while the toggle is in-flight, and
// surfaces server errors as toasts.
import { useState } from "react"
import { UserCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  followerId: string
  followingId: string
  className?: string
}

export function FollowButton({ followerId, followingId, className }: FollowButtonProps) {
  const follows = usePostStore((s) => s.follows)
  const toggleFollow = usePostStore((s) => s.toggleFollow)
  const showToast = useToastStore((s) => s.show)
  const [pending, setPending] = useState(false)

  const isFollowing = follows.some(
    (f) => f.followerId === followerId && f.followingId === followingId,
  )

  const handleClick = async () => {
    if (pending) return
    setPending(true)
    try {
      await toggleFollow(followerId, followingId)
    } catch (err) {
      const message = err instanceof Error ? err.message : s["validation.generic"]
      showToast(message, "error")
    } finally {
      setPending(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "primary"}
      onClick={handleClick}
      loading={pending}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? s["follow.button.following"] : s["follow.button.follow"]}
      className={cn("gap-1.5 px-3", className)}
    >
      <UserCheck size={16} aria-hidden />
      {isFollowing ? "Following" : "Follow"}
    </Button>
  )
}