"use client"

// FollowersModal: shows who follows a user (and who they follow) with
// avatars, names, usernames and Follow buttons. Opens from the profile stats.
// Reads the follows rows directly from Supabase on every open so the list is
// always fresh, and batch-loads the profiles into the user store cache.
import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { Avatar, Button, EmptyState, Modal, Skeleton, Tabs } from "@/components/ui"
import { FollowButton } from "./FollowButton"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import s from "@/lib/strings"

export type FollowsTab = "followers" | "following"

interface FollowersModalProps {
  open: boolean
  onClose: () => void
  // The profile whose followers/following we show.
  userId: string
  initialTab?: FollowsTab
}

interface FollowRow {
  follower_id: string
  following_id: string
}

export function FollowersModal({ open, onClose, userId, initialTab = "followers" }: FollowersModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const users = useUserStore((s) => s.users)
  const [tab, setTab] = useState<FollowsTab>(initialTab)
  const [ids, setIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (activeTab: FollowsTab) => {
      if (!open) return
      setLoading(true)
      const supabase = createSupabaseBrowserClient()
      const query =
        activeTab === "followers"
          ? supabase.from("follows").select("follower_id").eq("following_id", userId)
          : supabase.from("follows").select("following_id").eq("follower_id", userId)
      const { data } = await query
      const rows = (data ?? []) as FollowRow[]
      const nextIds = rows.map((r) =>
        activeTab === "followers" ? r.follower_id : r.following_id,
      )
      setIds(nextIds)
      if (nextIds.length > 0) {
        await useUserStore.getState().loadMany(nextIds)
      }
      setLoading(false)
    },
    [open, userId],
  )

  // Load on open and whenever the tab changes.
  useEffect(() => {
    if (open) load(tab)
  }, [open, tab, load])

  useEffect(() => {
    if (open) setTab(initialTab)
  }, [open, initialTab])

  const listUsers = ids
    .map((id) => users[id])
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .sort((a, b) => b.followerCount - a.followerCount)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tab === "followers" ? s["follow.modal.followers"] : s["follow.modal.following"]}
      className="sm:min-w-[26rem]"
    >
      <Tabs<FollowsTab>
        tabs={[
          { value: "followers", label: s["follow.modal.followers"] },
          { value: "following", label: s["follow.modal.following"] },
        ]}
        value={tab}
        onChange={setTab}
      />

      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : listUsers.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={
              tab === "followers"
                ? s["follow.modal.noFollowers.title"]
                : s["follow.modal.noFollowing.title"]
            }
            description={
              tab === "followers"
                ? s["follow.modal.noFollowers.description"]
                : s["follow.modal.noFollowing.description"]
            }
          />
        ) : (
          <ul className="flex flex-col">
            {listUsers.map((user) => {
              const isSelf = user.id === currentUser?.id
              return (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0"
                >
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={onClose}
                    className="flex min-w-0 items-center gap-3"
                  >
                    <Avatar name={user.name} src={user.avatarUrl ?? null} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-medium text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.username ? `@${user.username}` : user.state ?? ""}
                      </p>
                    </div>
                  </Link>
                  {!isSelf ? (
                    <FollowButton
                      followerId={currentUser?.id ?? ""}
                      followingId={user.id}
                      targetIsPrivate={Boolean(user.isPrivate)}
                      className="shrink-0"
                    />
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {s["follow.modal.you"]}
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Modal>
  )
}