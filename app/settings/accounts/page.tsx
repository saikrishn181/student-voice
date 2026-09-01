"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  Check,
  Trash2,
  LogOut,
  ArrowLeft,
  ArrowRightLeft,
  AlertCircle,
  PauseCircle,
  AlertTriangle,
  User as UserIcon,
  Lock,
} from "lucide-react"
import { Card, Button, Modal, Input } from "@/components/ui"
import { Avatar } from "@/components/ui/Avatar"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import {
  getSavedAccounts,
  removeSavedAccount,
  clearAllSavedAccounts,
  type SavedAccount,
} from "@/lib/savedAccounts"
import { cn } from "@/lib/utils"

export default function AccountsManagementPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const switchAccount = useAuthStore((s) => s.switchAccount)
  const deactivateAccount = useAuthStore((s) => s.deactivateAccount)
  const deleteAccountPermanently = useAuthStore((s) => s.deleteAccountPermanently)
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)

  const [accounts, setAccounts] = useState<SavedAccount[]>([])
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<SavedAccount | null>(null)

  // Deactivate modal state
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false)
  const [deactivatePassword, setDeactivatePassword] = useState("")
  const [deactivateLoading, setDeactivateLoading] = useState(false)
  const [deactivateError, setDeactivateError] = useState("")

  // Permanent Delete modal state
  const [deletePermanentModalOpen, setDeletePermanentModalOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const pressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const isLongPressRef = useRef<boolean>(false)

  useEffect(() => {
    setAccounts(getSavedAccounts())
  }, [currentUser])

  const handleSwitch = async (account: SavedAccount) => {
    if (account.id === currentUser?.id) return

    setSwitchingId(account.id)
    const result = await switchAccount(account.id)
    setSwitchingId(null)

    if (result.ok) {
      showToast(`Switched to ${account.name}`, "success")
      router.push("/feed")
    } else {
      if (result.error === "SESSION_EXPIRED" || result.email) {
        showToast(`Session for ${account.name} expired. Enter password to log in.`, "info")
        router.push(`/login?email=${encodeURIComponent(account.email || result.email || "")}&switched=true`)
      } else {
        showToast(result.error || "Could not switch account. Please log in again.", "error")
        router.push(`/login?email=${encodeURIComponent(account.email || "")}`)
      }
    }
  }

  const handleTouchStart = (account: SavedAccount) => {
    isLongPressRef.current = false
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50)
      }
      setAccountToDelete(account)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const handleRowClick = (account: SavedAccount) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false
      return
    }
    if (account.id !== currentUser?.id && switchingId !== account.id) {
      handleSwitch(account)
    }
  }

  const confirmRemoveAccount = async (account: SavedAccount) => {
    const updated = removeSavedAccount(account.id)
    setAccounts(updated)
    setAccountToDelete(null)

    if (account.id === currentUser?.id) {
      setLoggingOut(true)
      await logout()
      setLoggingOut(false)
      showToast("Account removed from this device. You can log back in anytime with your password.", "info")
      router.push("/login")
    } else {
      showToast(`Removed ${account.name} from this device. The account remains safe online.`, "info")
    }
  }

  const handleDeactivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setDeactivateError("")
    setDeactivateLoading(true)

    const res = await deactivateAccount(deactivatePassword)
    setDeactivateLoading(false)

    if (res.ok) {
      setDeactivateModalOpen(false)
      setDeactivatePassword("")
      showToast("Account deactivated. You can reactivate anytime by logging back in with your password.", "info")
      router.push("/login")
    } else {
      setDeactivateError(res.error || "Failed to deactivate account.")
    }
  }

  const handleDeletePermanently = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deletePassword) {
      setDeleteError("Password is required to permanently delete your account.")
      return
    }
    setDeleteError("")
    setDeleteLoading(true)

    const res = await deleteAccountPermanently(deletePassword)
    setDeleteLoading(false)

    if (res.ok) {
      setDeletePermanentModalOpen(false)
      setDeletePassword("")
      showToast("Your account and all associated data have been permanently deleted.", "info")
      router.push("/login")
    } else {
      setDeleteError(res.error || "Failed to delete account. Please verify your password.")
    }
  }

  const handleLogoutCurrent = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
    showToast("You have been logged out", "info")
    router.push("/login")
  }

  const handleLogoutAll = async () => {
    setLoggingOut(true)
    clearAllSavedAccounts()
    await logout()
    setLoggingOut(false)
    showToast("Logged out of all accounts on this device", "info")
    router.push("/login")
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-4">
      {/* Top Header with Back Navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/settings"
          className="flex h-9 w-9 items-center justify-center rounded-card border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          aria-label="Back to Settings"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-h2 font-bold text-slate-900 leading-tight">Manage Accounts</h1>
          <p className="text-body-sm text-slate-500">
            Switch or add student and organization accounts on this device
          </p>
        </div>
      </div>

      {/* Current Active Account Card */}
      {currentUser && (
        <Card className="flex flex-col gap-3 p-4 border-primary-300 bg-primary-50/40 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-800 flex items-center gap-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Currently Active Account
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <Check size={12} strokeWidth={2.5} /> Active
            </span>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <Avatar name={currentUser.name} src={currentUser.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-900 truncate">{currentUser.name}</h2>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0",
                    currentUser.accountType === "organization"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                  )}
                >
                  {currentUser.accountType === "organization" ? "Organization" : "Student"}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {currentUser.email || (currentUser.username ? `@${currentUser.username}` : currentUser.state || "")}
              </p>
              {currentUser.state && (
                <p className="text-[11px] text-slate-400 mt-0.5">{currentUser.state}, India</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Saved Accounts List on this Device */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            All Saved Accounts ({accounts.length})
          </h2>
          <Link
            href="/login?add_account=true"
            className="text-xs font-bold text-primary-700 hover:underline flex items-center gap-1"
          >
            <UserPlus size={14} /> + Add Account
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const isActive = account.id === currentUser?.id
              const isSwitching = switchingId === account.id

              return (
                <Card
                  key={account.id}
                  onTouchStart={() => handleTouchStart(account)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  onMouseDown={() => handleTouchStart(account)}
                  onMouseUp={handleTouchEnd}
                  onMouseLeave={handleTouchEnd}
                  onClick={() => handleRowClick(account)}
                  className={cn(
                    "group flex select-none items-center justify-between gap-3 p-3.5 transition-all",
                    isActive
                      ? "border-primary-500 bg-primary-50/30"
                      : "hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer active:scale-[0.99]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <Avatar name={account.name} src={account.avatarUrl} size="md" />
                      {isActive && (
                        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white text-white">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-bold text-slate-900">{account.name}</p>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                            account.accountType === "organization"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          )}
                        >
                          {account.accountType === "organization" ? "Org" : "Student"}
                        </span>
                      </div>

                      <p className="truncate text-xs text-slate-500">
                        {account.email || (account.username ? `@${account.username}` : account.state || "Saved")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Check size={12} strokeWidth={2.5} /> Active
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isSwitching}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSwitch(account)
                        }}
                        className="h-8 text-xs font-semibold px-3 border-primary-300 text-primary-700 hover:bg-primary-50"
                      >
                        <ArrowRightLeft size={13} className="mr-1" />
                        Switch
                      </Button>
                    )}

                    <button
                      type="button"
                      aria-label={`Remove ${account.name} from this device`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setAccountToDelete(account)
                      }}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remove from this device"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </Card>
              )
            })
          ) : (
            <Card className="p-6 text-center bg-slate-50 border-dashed">
              <UserIcon className="mx-auto h-8 w-8 text-slate-400 mb-1" />
              <p className="text-sm font-medium text-slate-700">No other saved accounts</p>
              <p className="text-xs text-slate-500 mt-0.5">Add an account to quickly switch between them</p>
            </Card>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400">
          Tap an account to switch • Long-press or tap <Trash2 size={11} className="inline mx-0.5 text-slate-400" /> to remove from device
        </p>
      </div>

      {/* 1. Add Account Action */}
      <div className="flex flex-col gap-3">
        <Link href="/login?add_account=true" className="w-full">
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            className="border-dashed border-primary-400 text-primary-700 hover:bg-primary-50 hover:border-primary-500 font-bold"
          >
            <UserPlus size={18} className="mr-2 text-primary-600" />
            + Add Another Account
          </Button>
        </Link>
      </div>

      {/* 2. Deactivate & Delete Account Options */}
      <div className="flex flex-col gap-3 pt-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
          Account Management Options
        </h2>

        {/* Deactivate Option */}
        <Card className="flex items-center justify-between p-4 hover:border-amber-300 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <PauseCircle size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Deactivate Account</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Temporarily disable your profile & posts. Log back in anytime with password to reactivate.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeactivateModalOpen(true)}
            className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-50 text-xs font-semibold ml-3"
          >
            Deactivate
          </Button>
        </Card>

        {/* Delete Options */}
        <Card className="flex items-center justify-between p-4 hover:border-red-300 transition-colors">
          <div className="flex items-start gap-3 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <Trash2 size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Delete Account</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanently delete all your posts, comments, and profile from Krantind database.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setDeletePermanentModalOpen(true)}
            className="shrink-0 text-xs font-semibold ml-3"
          >
            Delete
          </Button>
        </Card>

        {/* Sign Out Card */}
        <Card className="flex items-center justify-between p-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Sign Out Options</h3>
            <p className="text-xs text-slate-500">Log out of current account or all accounts on device</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loggingOut}
              onClick={handleLogoutCurrent}
              className="text-xs text-slate-700"
            >
              <LogOut size={13} className="mr-1" />
              Log out
            </Button>

            {accounts.length > 1 && (
              <Button
                variant="danger"
                size="sm"
                disabled={loggingOut}
                onClick={handleLogoutAll}
                className="text-xs"
              >
                Log out all
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Remove Account from Device Confirmation Dialog */}
      <Modal
        open={Boolean(accountToDelete)}
        onClose={() => setAccountToDelete(null)}
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle size={20} />
            <span>Remove Account from Device?</span>
          </div>
        }
        className="sm:max-w-md"
      >
        {accountToDelete && (
          <div className="flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3 rounded-card bg-slate-50 border border-slate-200 p-3">
              <Avatar name={accountToDelete.name} src={accountToDelete.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 truncate">{accountToDelete.name}</p>
                <p className="text-xs text-slate-500 truncate">
                  {accountToDelete.email || (accountToDelete.username ? `@${accountToDelete.username}` : accountToDelete.state || "Saved Account")}
                </p>
              </div>
            </div>

            <div className="rounded-card border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold flex items-center gap-1 text-amber-900">
                Your account is safe and NOT deleted!
              </p>
              <p className="text-slate-700">
                This will only remove <strong>{accountToDelete.name}</strong> from this browser/device. All your posts, profile, and data stay 100% intact online.
              </p>
              <p className="text-slate-600">
                If you ever want to access it again, simply log in by entering your email/ID and password.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAccountToDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => confirmRemoveAccount(accountToDelete)}
              >
                <Trash2 size={14} className="mr-1.5" />
                Remove from Device
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Deactivate Account Modal */}
      <Modal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-amber-800">
            <PauseCircle size={20} />
            <span>Deactivate Account?</span>
          </div>
        }
        className="sm:max-w-md"
      >
        <form onSubmit={handleDeactivate} className="flex flex-col gap-4 text-left">
          <div className="rounded-card border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-2">
            <p className="font-bold text-amber-900 flex items-center gap-1.5">
              Temporary Deactivation
            </p>
            <p className="text-slate-700">
              Deactivating will temporarily hide your profile and posts from other students and organizations.
            </p>
            <p className="text-emerald-800 font-semibold">
              You can reactivate anytime simply by logging back in with your email/ID and password!
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter your password to confirm
            </label>
            <Input
              type="password"
              placeholder="Your password"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              error={deactivateError}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeactivateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              loading={deactivateLoading}
              className="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold"
            >
              Confirm Deactivation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Permanently Delete Account Modal */}
      <Modal
        open={deletePermanentModalOpen}
        onClose={() => setDeletePermanentModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle size={20} />
            <span>Permanently Delete Account?</span>
          </div>
        }
        className="sm:max-w-md"
      >
        <form onSubmit={handleDeletePermanently} className="flex flex-col gap-4 text-left">
          <div className="rounded-card border border-red-200 bg-red-50 p-3.5 text-xs text-red-950 space-y-2">
            <p className="font-bold text-red-900 flex items-center gap-1.5">
              Permanent Deletion Warning
            </p>
            <p className="text-slate-800">
              This action <strong>cannot be undone</strong>. Your account, profile, posts, comments, and followers will be permanently wiped from the database.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter your password to confirm deletion
            </label>
            <Input
              type="password"
              placeholder="Your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              error={deleteError}
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletePermanentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              loading={deleteLoading}
              className="font-bold"
            >
              Delete Permanently
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
