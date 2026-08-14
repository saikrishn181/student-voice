"use client"

import { useState } from "react"
import { Modal, Button } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { EditProfileModal } from "./EditProfileModal"
import s from "@/lib/strings"

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
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
        </div>
      </Modal>

      <EditProfileModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
      />
    </>
  )
}
