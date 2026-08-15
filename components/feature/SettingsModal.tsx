"use client"

import { useState } from "react"
import { Modal, Button, Avatar } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { usePostStore } from "@/lib/store/usePostStore"
import { useUserById } from "@/hooks"
import { EditProfileModal } from "./EditProfileModal"
import s from "@/lib/strings"
import Link from "next/link"
import { ShieldBan } from "lucide-react"

// A single blocked user row with an "Unblock" button
function BlockedUserCard({ userId }: { userId: string }) {
  const user = useUserById(userId)
  const unblockUser = usePostStore((s) => s.unblockUser)
  const [unblocking, setUnblocking] = useState(false)

  return (
    <li className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
      <Link href={`/profile/${userId}`} className="flex min-w-0 items-center gap-3">
        <Avatar name={user?.name ?? "?"} src={user?.avatarUrl ?? null} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-slate-900">{user?.name ?? "…"}</p>
          <p className="text-xs text-slate-500">{user?.username ? `@${user.username}` : ""}</p>
        </div>
      </Link>
      <Button
        variant="outline"
        size="sm"
        loading={unblocking}
        onClick={async () => {
          setUnblocking(true)
          try {
            await unblockUser(userId)
          } finally {
            setUnblocking(false)
          }
        }}
      >
        {s["block.unblock"]}
      </Button>
    </li>
  )
}

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const [editProfileOpen, setEditProfileOpen] = useState(false)

  // Keep the auth method logic generic - currently just showing the email.
  const displayEmail = currentUser?.email || "No email available"

  return (
    <>
      <Modal
        open={open && !editProfileOpen} // Hide this modal if edit profile is open
        onClose={onClose}
        title={s["settings.title"] || "Settings"}
        className="sm:max-w-md"
      >
        <div className="flex flex-col gap-6">
          {/* Account Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-h4 font-medium text-slate-900">Account</h3>
            <div className="rounded-card bg-slate-50 p-4 border border-slate-100">
              <p className="text-sm font-medium text-slate-700">Signed in as</p>
              <p className="text-sm text-slate-500 mt-1">{displayEmail}</p>
            </div>
          </div>

          {/* Profile Section */}
          <div className="flex flex-col gap-2">
            <h3 className="text-h4 font-medium text-slate-900">Profile</h3>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-slate-500">
                Update your name, bio, location, and privacy settings.
              </p>
              <Button
                variant="outline"
                className="w-full justify-center"
                onClick={() => setEditProfileOpen(true)}
              >
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Blocked users management */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ShieldBan size={18} className="text-slate-400" aria-hidden />
              <h3 className="text-h4 font-medium text-slate-900">{s["profile.blockedUsers.title"]}</h3>
            </div>
            {blockedUserIds.length === 0 ? (
              <div className="rounded-card bg-slate-50 p-4 border border-slate-100">
                <p className="text-center text-body-sm text-slate-500">
                  {s["profile.blockedUsers.empty"]}
                </p>
              </div>
            ) : (
              <div className="rounded-card bg-slate-50 p-4 border border-slate-100">
                <p className="mb-3 text-body-sm text-slate-500">
                  {s["profile.blockedUsers.description"]}
                </p>
                <ul>
                  {blockedUserIds.map((id) => (
                    <BlockedUserCard key={id} userId={id} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
    </>
  )
}
