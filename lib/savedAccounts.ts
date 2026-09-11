import type { AccountType, OrganizationType, User } from "./types"

export interface SavedAccount {
  id: string
  email: string
  name: string
  username?: string
  avatarUrl?: string
  accountType: AccountType
  organizationType?: OrganizationType
  state?: string
  lastActiveAt: number
}

const STORAGE_KEY = "krantind_saved_accounts"

export function getSavedAccounts(): SavedAccount[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAccount(user: User): SavedAccount[] {
  if (typeof window === "undefined" || !user?.id) return []
  try {
    const existing = getSavedAccounts()
    const index = existing.findIndex((a) => a.id === user.id)
    const updatedAccount: SavedAccount = {
      id: user.id,
      email: user.email || (index >= 0 ? existing[index].email : ""),
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      accountType: user.accountType,
      organizationType: user.organizationType,
      state: user.state,
      lastActiveAt: Date.now(),
    }

    let newList: SavedAccount[]
    if (index >= 0) {
      newList = [...existing]
      newList[index] = updatedAccount
    } else {
      newList = [updatedAccount, ...existing]
    }
    // Sort by most recently active
    newList.sort((a, b) => (b.lastActiveAt || 0) - (a.lastActiveAt || 0))
    // Keep up to 5 saved accounts
    if (newList.length > 5) newList = newList.slice(0, 5)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newList))
    return newList
  } catch {
    return []
  }
}

export function removeSavedAccount(accountId: string): SavedAccount[] {
  if (typeof window === "undefined") return []
  try {
    const existing = getSavedAccounts()
    const filtered = existing.filter((a) => a.id !== accountId)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return filtered
  } catch {
    return []
  }
}

export function clearAllSavedAccounts(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {}
}
