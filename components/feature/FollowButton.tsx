"use client"

// Follow / Following toggle button, wired to the post store's follow list so
// the state reflects live updates.
import { UserCheck } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePostStore } from "@/lib/store/usePostStore"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  followerId: string
  followingId: string
  className?: string
}

export function FollowButton({ followerId, followingId, className }: FollowButtonProps) {
  const follows = usePostStore((s) => s.follows)
  const toggleFollow = usePostStore((s) => s.toggleFollow)

  const isFollowing = follows.some(
    (f) => f.followerId === followerId && f.followingId === followingId,
  )

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "primary"}
      onClick={() => toggleFollow(followerId, followingId)}
      aria-pressed={isFollowing}
      className={cn("gap-1.5 px-3", className)}
    >
      <UserCheck size={16} aria-hidden />
      {isFollowing ? "Following" : "Follow"}
    </Button>
  )
}