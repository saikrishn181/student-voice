"use client"

// Auth store backed by Supabase Auth (email/password).
//
// - Session is persisted by Supabase in cookies (via middleware) and restored
//   on load from a memory cache so the UI hydrates instantly.
// - The User profile row (`public.profiles`) is kept in sync with auth.users.
// - isLoggedIn / currentUser are the same fields the UI already consumes.
import { create } from "zustand"

import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import type { AccountType, OrganizationType, Profile, User } from "@/lib/types"
import { useUserStore } from "./useUserStore"

export interface SignupPayload {
  name: string
  email: string
  password: string
  accountType: AccountType
  organizationType?: OrganizationType
}

export interface AuthResult {
  ok: boolean
  error?: string
}

interface AuthState {
  isLoggedIn: boolean
  currentUser: User | null
  // True while the initial session restore is still resolving.
  bootstrapping: boolean

  bootstrap: () => void
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (payload: SignupPayload) => Promise<AuthResult>
  signInWithGoogle: (next?: string) => Promise<AuthResult>
  setRegion: (state: string) => Promise<void>
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

// Editable profile fields (settings / edit-profile).
export interface ProfilePatch {
  name?: string
  username?: string
  avatarUrl?: string
  state?: string
  bio?: string
  isPrivate?: boolean
}

// Map a `profiles` row to the app's User type.
function rowToUser(row: Profile): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username ?? undefined,
    accountType: row.account_type,
    organizationType: row.organization_type ?? undefined,
    verificationStatus: row.verification_status ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    state: row.state ?? undefined,
    bio: row.bio ?? undefined,
    followerCount: row.follower_count,
    followingCount: row.following_count,
    createdAt: row.created_at,
    isAdmin: row.is_admin,
    isPrivate: row.is_private,
  }
}

async function fetchProfile(userId: string): Promise<User | null> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
  if (error || !data) return null
  return rowToUser(data as Profile)
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  isLoggedIn: false,
  currentUser: null,
  bootstrapping: true,

  login: async (email, password) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error || !data.session) {
      return { ok: false, error: normalizeErrorMessage(error?.message) }
    }
    const user = await fetchProfile(data.session.user.id)
    set({ isLoggedIn: true, currentUser: user ?? null })
    return { ok: true }
  },

  signup: async (payload) => {
    const supabase = createSupabaseBrowserClient()
    const meta: Record<string, string> = {
      name: payload.name,
      account_type: payload.accountType,
    }
    if (payload.accountType === "organization" && payload.organizationType) {
      meta.organization_type = payload.organizationType
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: { data: meta },
    })
    // Supabase signs the user in immediately when email confirmation is off.
    if (error || !data.session) {
      return { ok: false, error: normalizeErrorMessage(error?.message) }
    }
    const user = await fetchProfile(data.session.user.id)
    set({ isLoggedIn: true, currentUser: user ?? null })
    return { ok: true }
  },

  signInWithGoogle: async (next) => {
    const supabase = createSupabaseBrowserClient()
    // Return to the app after Google's consent screen; lands on /auth/callback.
    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    })
    if (error) {
      return { ok: false, error: normalizeErrorMessage(error.message) }
    }
    return { ok: true }
  },

  setRegion: async (state) => {
    const { currentUser } = get()
    if (!currentUser) return
    const supabase = createSupabaseBrowserClient()
    await supabase.from("profiles").update({ state }).eq("id", currentUser.id)
    set({ currentUser: { ...currentUser, state } })
  },

  updateProfile: async (patch) => {
    const { currentUser } = get()
    if (!currentUser) return { ok: false, error: "Not logged in." }

    const supabase = createSupabaseBrowserClient()

    // Username is case-insensitively unique in the DB; normalize before write
    // so an error from Postgres maps cleanly to a friendly message.
    const row: Partial<Profile> = {
      name: patch.name,
      username: patch.username?.trim() || null,
      avatar_url: patch.avatarUrl ?? null,
      state: patch.state,
      bio: patch.bio ?? null,
      is_private: patch.isPrivate,
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", currentUser.id)
      .select()
      .maybeSingle()

    if (error) {
      return { ok: false, error: friendlyProfileError(error.message) }
    }
    if (!data) return { ok: false, error: "Could not save your profile." }

    set({ currentUser: rowToUser(data as Profile) })
    // Keep the shared profiles cache in sync so other pages see the changes.
    useUserStore.setState((s) => ({
      users: { ...s.users, [currentUser.id]: rowToUser(data as Profile) },
    }))
    return { ok: true }
  },

  logout: async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    set({ isLoggedIn: false, currentUser: null })
  },

  refreshProfile: async () => {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      set({ isLoggedIn: false, currentUser: null })
      return
    }
    const user = await fetchProfile(data.user.id)
    set({ isLoggedIn: true, currentUser: user })
  },

  bootstrap: () => {
    // Restore session synchronously from the client (cookies may already hold
    // a session restored by middleware on first request).
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        set({ isLoggedIn: false, currentUser: null, bootstrapping: false })
        return
      }
      fetchProfile(data.user.id).then((user) => {
        set({
          isLoggedIn: true,
          currentUser: user,
          bootstrapping: false,
        })
      })
    })

    // Keep the store in sync with auth changes (sign-in from other tabs, etc.).
    supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        supabase.auth.getUser().then(({ data }) => {
          if (!data.user) return
          fetchProfile(data.user.id).then((user) => {
            set({ isLoggedIn: true, currentUser: user, bootstrapping: false })
          })
        })
      } else if (event === "SIGNED_OUT") {
        set({ isLoggedIn: false, currentUser: null, bootstrapping: false })
      }
    })
  },
}))

function normalizeErrorMessage(message?: string): string {
  if (!message) return "Something went wrong. Please try again."
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password."
  }
  if (message.includes("already registered")) {
    return "An account with this email already exists."
  }
  if (message.includes("Password should be")) {
    return "Password should be at least 6 characters."
  }
  return message
}

function friendlyProfileError(message: string): string {
  if (message.toLowerCase().includes("profiles_username_key")) {
    return "That username is already taken. Try another one."
  }
  if (message.includes("permission") || message.toLowerCase().includes("row-level security")) {
    return "You can only edit your own profile."
  }
  return message || "Something went wrong. Please try again."
}