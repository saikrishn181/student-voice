"use client"

// EditProfileModal: the "Settings" popover on the profile page. Lets the user
// change their display name, @username, avatar, bio, and state. Saves via
// useAuthStore.updateProfile (writes through to the Supabase profiles row).
import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera } from "lucide-react"
import { Avatar, Button, Input, Modal, Select, Textarea } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { uploadAvatar } from "@/lib/supabase/storage"
import { STATES } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

interface EditProfileModalProps {
  open: boolean
  onClose: () => void
}

const USERNAME_RE = /^[a-zA-Z0-9_]+$/
const MAX_AVATAR_MB = 5

export function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const currentUser = useAuthStore((s) => s.currentUser)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const showToast = useToastStore((s) => s.show)

  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [state, setState] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [removeAvatar, setRemoveAvatar] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState<string | undefined>()
  const [usernameError, setUsernameError] = useState<string | undefined>()

  // Populate the form from the current user whenever the modal opens.
  useEffect(() => {
    if (!open || !currentUser) return
    setName(currentUser.name)
    setUsername(currentUser.username ?? "")
    setBio(currentUser.bio ?? "")
    setState(currentUser.state ?? "")
    setAvatarUrl(currentUser.avatarUrl ?? null)
    setAvatarFile(null)
    setRemoveAvatar(false)
    setNameError(undefined)
    setUsernameError(undefined)
  }, [open, currentUser])

  const handleAvatarFile = (file: File | undefined | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      showToast(s["validation.fileType"], "error")
      return
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      showToast(s["settings.avatar.tooLarge"](MAX_AVATAR_MB), "error")
      return
    }
    setAvatarFile(file)
    setAvatarUrl(URL.createObjectURL(file))
    setRemoveAvatar(false)
  }

  const handleSave = async () => {
    if (!currentUser) return

    const trimmedName = name.trim()
    const trimmedUsername = username.trim()

    if (!trimmedName) {
      setNameError(s["validation.nameRequired"])
      return
    }
    setNameError(undefined)

    if (trimmedUsername && !USERNAME_RE.test(trimmedUsername)) {
      setUsernameError(s["validation.usernameInvalid"])
      return
    }
    setUsernameError(undefined)

    setSaving(true)

    // Upload a new avatar first if one was selected.
    let nextAvatarUrl = avatarUrl
    if (avatarFile) {
      const result = await uploadAvatar(avatarFile)
      if (!result.ok || !result.url) {
        showToast(result.error ?? s["settings.avatar.uploadFailed"], "error")
        setSaving(false)
        return
      }
      nextAvatarUrl = result.url
    } else if (removeAvatar) {
      nextAvatarUrl = null
    }

    const result = await updateProfile({
      name: trimmedName,
      username: trimmedUsername,
      bio,
      state: state || undefined,
      avatarUrl: nextAvatarUrl ?? undefined,
    })

    setSaving(false)

    if (avatarUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarUrl)

    if (!result.ok) {
      showToast(result.error ?? s["validation.generic"], "error")
      if (result.error?.toLowerCase().includes("username")) {
        setUsernameError(result.error)
      }
      return
    }

    showToast(s["toast.profileUpdated"], "success")
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={s["settings.title"]}
      className="sm:min-w-[28rem] sm:max-w-xl"
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
      >
        {/* Avatar picker */}
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <span className="relative inline-flex h-20 w-20 shrink-0 overflow-hidden rounded-full">
              <Image
                src={avatarUrl}
                alt={s["settings.avatar.label"]}
                fill
                className="object-cover"
                unoptimized
              />
            </span>
          ) : (
            <Avatar name={currentUser?.name ?? ""} size="lg" />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={<Camera size={16} />}
              onClick={() => fileRef.current?.click()}
            >
              {s["settings.avatar.change"]}
            </Button>
            {avatarUrl || currentUser?.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={() => {
                  if (avatarUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarUrl)
                  setAvatarUrl(null)
                  setAvatarFile(null)
                  setRemoveAvatar(true)
                }}
              >
                {s["settings.avatar.remove"]}
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden
            onChange={(e) => {
              handleAvatarFile(e.target.files?.[0])
              e.target.value = ""
            }}
          />
        </div>

        <Input
          label={s["settings.nameLabel"]}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={s["settings.namePlaceholder"]}
          error={nameError}
          required
        />

        <Input
          label={s["settings.usernameLabel"]}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={s["settings.usernamePlaceholder"]}
          error={usernameError}
        />
        <p className={cn("-mt-3 text-xs", usernameError ? "text-red-600" : "text-slate-400")}>
          {s["settings.usernameHint"]}
        </p>

        <Textarea
          label={s["settings.bioLabel"]}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder={s["settings.bioPlaceholder"]}
          rows={3}
          maxLength={280}
        />

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700">{s["settings.regionLabel"]}</p>
          <Select
            label={s["onboarding.region.stateLabel"]}
            options={STATES.map((st) => ({ value: st, label: st }))}
            placeholder={s["onboarding.region.statePlaceholder"]}
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <p className="-mt-1 text-xs text-slate-400">{s["settings.regionHint"]}</p>
        </div>

        <div className="mt-2 flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            {s["settings.cancel"]}
          </Button>
          <Button type="submit" loading={saving}>
            {s["settings.save"]}
          </Button>
        </div>
      </form>
    </Modal>
  )
}