"use client"

// Follow / Following toggle button, wired to the post store's follow list so
// the state reflects live updates. Disabled while the toggle is in-flight, and
// surfaces server errors as toasts.
//
// For PRIVATE targets: instead of following directly, a follow request is sent
// and the button shows "Requested" until the owner accepts.
import { useState } from "react"
import { UserCheck, Clock } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { usePostStore } from "@/lib/store/usePostStore"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

interface FollowButtonProps {
  followerId: string
  followingId: string
  // True when the target has a private account (follow requires approval).
  targetIsPrivate?: boolean
  className?: string
}

export function FollowButton({
  followerId,
  followingId,
  targetIsPrivate = false,
  className,
}: FollowButtonProps) {
  const follows = usePostStore((s) => s.follows)
  const followRequests = usePostStore((s) => s.followRequests)
  const toggleFollow = usePostStore((s) => s.toggleFollow)
  const sendFollowRequest = usePostStore((s) => s.sendFollowRequest)
  const showToast = useToastStore((s) => s.show)
  const [pending, setPending] = useState(false)

  const isFollowing = follows.some(
    (f) => f.followerId === followerId && f.followingId === followingId,
  )
  const isRequested = followRequests.some(
    (r) =>
      r.requesterId === followerId &&
      r.targetId === followingId &&
      r.status === "pending",
  )

  const handleClick = async () => {
    if (pending) return
    setPending(true)
    try {
      if (targetIsPrivate && !isFollowing) {
        await sendFollowRequest(followingId, followerId)
        showToast(s["follow.requestSent"], "success")
      } else {
        await toggleFollow(followerId, followingId)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : s["validation.generic"]
      showToast(message, "error")
    } finally {
      setPending(false)
    }
  }

  const label = isFollowing
    ? "Following"
    : isRequested
      ? "Requested"
      : targetIsPrivate
        ? "Follow request"
        : "Follow"

  return (
    <Button
      size="sm"
      variant={isFollowing ? "outline" : "primary"}
      onClick={handleClick}
      loading={pending}
      disabled={isRequested}
      aria-pressed={isFollowing}
      aria-label={label}
      className={cn("gap-1.5 px-3", className)}
    >
      {isRequested ? <Clock size={16} aria-hidden /> : <UserCheck size={16} aria-hidden />}
      {label}
    </Button>
  )
}