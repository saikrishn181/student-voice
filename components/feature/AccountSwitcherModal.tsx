"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Users, UserPlus, Check, Trash2, LogOut, ArrowRightLeft, ShieldCheck, User as UserIcon } from "lucide-react"
import { Modal, Button } from "@/components/ui"
import { Avatar } from "@/components/ui/Avatar"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { getSavedAccounts, removeSavedAccount, clearAllSavedAccounts, type SavedAccount } from "@/lib/savedAccounts"
import { cn } from "@/lib/utils"

interface AccountSwitcherModalProps {
  open: boolean
  onClose: () => void
}

export function AccountSwitcherModal({ open, onClose }: AccountSwitcherModalProps) {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const switchAccount = useAuthStore((s) => s.switchAccount)
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)

  const [accounts, setAccounts] = useState<SavedAccount[]>([])
  const [switchingId, setSwitchingId] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  // Refresh saved accounts list whenever modal is opened
  useEffect(() => {
    if (open) {
      setAccounts(getSavedAccounts())
    }
  }, [open, currentUser])

  const handleSwitch = async (account: SavedAccount) => {
    if (account.id === currentUser?.id) {
      onClose()
      return
    }
    setSwitchingId(account.id)
    const result = await switchAccount(account.id)
    setSwitchingId(null)

    if (result.ok) {
      showToast(`Switched to ${account.name}`, "success")
      onClose()
      router.push("/feed")
    } else {
      if (result.error === "SESSION_EXPIRED" || result.email) {
        showToast(`Session for ${account.name} expired. Please enter password to log in.`, "info")
        onClose()
        router.push(`/login?email=${encodeURIComponent(account.email || result.email || "")}&switched=true`)
      } else {
        showToast(result.error || "Could not switch account. Please log in again.", "error")
        onClose()
        router.push(`/login?email=${encodeURIComponent(account.email || "")}`)
      }
    }
  }

  const handleAddAccount = () => {
    onClose()
    router.push("/login?add_account=true")
  }

  const handleRemoveAccount = (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.stopPropagation()
    const updated = removeSavedAccount(accountId)
    setAccounts(updated)
    showToast(`Removed ${accountName} from this device`, "info")
  }

  const handleLogoutCurrent = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
    showToast("You have been logged out", "info")
    onClose()
    router.push("/login")
  }

  const handleLogoutAll = async () => {
    setLoggingOut(true)
    clearAllSavedAccounts()
    await logout()
    setLoggingOut(false)
    showToast("Logged out of all accounts on this device", "info")
    onClose()
    router.push("/login")
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-primary-700">
            <Users size={18} aria-hidden />
          </span>
          <div>
            <span className="block text-base font-bold text-slate-900 leading-tight">Switch Account</span>
            <span className="block text-xs font-normal text-slate-500">Manage multiple accounts on this device</span>
          </div>
        </div>
      }
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        {/* Saved Accounts List */}
        <div className="flex flex-col gap-2">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const isActive = account.id === currentUser?.id
              const isSwitching = switchingId === account.id

              return (
                <div
                  key={account.id}
                  onClick={() => !isActive && !isSwitching && handleSwitch(account)}
                  className={cn(
                    "group relative flex items-center justify-between gap-3 rounded-card border p-3 transition-all",
                    isActive
                      ? "border-primary-500 bg-primary-50/40 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 cursor-pointer"
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
                          {account.accountType === "organization" ? "Organization" : "Student"}
                        </span>
                      </div>

                      <p className="truncate text-xs text-slate-500">
                        {account.email || (account.username ? `@${account.username}` : account.state || "Active")}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isActive ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <Check size={12} strokeWidth={2.5} /> Active
                      </span>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          loading={isSwitching}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSwitch(account)
                          }}
                          className="h-8 text-xs px-3"
                        >
                          <ArrowRightLeft size={13} className="mr-1" />
                          Switch
                        </Button>

                        <button
                          type="button"
                          aria-label={`Remove ${account.name}`}
                          onClick={(e) => handleRemoveAccount(e, account.id, account.name)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Remove from device"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-card border border-slate-200 bg-slate-50 p-4 text-center">
              <UserIcon className="mx-auto h-8 w-8 text-slate-400 mb-1" />
              <p className="text-sm font-medium text-slate-700">No other saved accounts</p>
              <p className="text-xs text-slate-500 mt-0.5">Add an account to quickly switch between them</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="lg"
            fullWidth
            onClick={handleAddAccount}
            className="border-dashed border-primary-300 text-primary-700 hover:bg-primary-50/50 hover:border-primary-400 font-semibold"
          >
            <UserPlus size={18} className="mr-2 text-primary-600" />
            + Add Another Account
          </Button>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogoutCurrent}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 transition-colors p-1.5 rounded"
            >
              <LogOut size={14} />
              Log out current
            </button>

            {accounts.length > 1 ? (
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleLogoutAll}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors p-1.5"
              >
                Log out of all accounts
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  )
}
