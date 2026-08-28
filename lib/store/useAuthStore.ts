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
import { rowToUser } from "@/lib/mappers"
import { useUserStore } from "./useUserStore"

export interface SignupPayload {
  name: string
  email: string
  password: string
  accountType: AccountType
  organizationType?: OrganizationType
  inviteCode?: string
}

export interface AuthResult {
  ok: boolean
  error?: string
  requiresOtp?: boolean
}

interface AuthState {
  isLoggedIn: boolean
  currentUser: User | null
  // True while the initial session restore is still resolving.
  bootstrapping: boolean

  bootstrap: () => void
  login: (email: string, password: string) => Promise<AuthResult>
  signup: (payload: SignupPayload) => Promise<AuthResult>
  verifySignupOtp: (email: string, token: string) => Promise<AuthResult>
  resendSignupOtp: (email: string) => Promise<AuthResult>
  signInWithGoogle: (next?: string) => Promise<AuthResult>
  setRegion: (state: string) => Promise<void>
  // One-time onboarding: name, region, account type (Google users), privacy
  // and bio. Writes the profiles row then refreshes currentUser.
  finishOnboarding: (payload: {
    name: string
    state: string
    accountType?: AccountType
    organizationType?: OrganizationType
    bio?: string
    isPrivate?: boolean
    // Set for Google sign-ups so the account also gets a password.
    password?: string
  }) => Promise<AuthResult>
  updateProfile: (patch: ProfilePatch) => Promise<AuthResult>
  // Sets (or changes) the account password via Supabase auth.
  setPassword: (password: string) => Promise<AuthResult>
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

let authListenerSubscription: { unsubscribe: () => void } | null = null

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
    if (payload.inviteCode?.trim()) {
      meta.invite_code = payload.inviteCode.trim()
    }
    if (payload.accountType === "organization" && payload.organizationType) {
      meta.organization_type = payload.organizationType
    }

    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: { data: meta },
    })
    if (error) {
      return { ok: false, error: normalizeErrorMessage(error.message) }
    }
    // If session exists immediately (instant sign-in when confirmation is off):
    if (data.session) {
      const user = await fetchProfile(data.session.user.id)
      set({ isLoggedIn: true, currentUser: user ?? null })
      return { ok: true, requiresOtp: false }
    }
    // If user created and confirmation OTP was dispatched to email:
    if (data.user) {
      return { ok: true, requiresOtp: true }
    }
    return { ok: false, error: "Unable to create your account. Please try again." }
  },

  verifySignupOtp: async (email, token) => {
    const supabase = createSupabaseBrowserClient()
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: "signup",
    })
    if (error || !data.session) {
      // Fallback attempt with type: 'email'
      const fallback = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type: "email",
      })
      if (fallback.error || !fallback.data.session) {
        return { ok: false, error: normalizeErrorMessage(fallback.error?.message || error?.message) }
      }
      const user = await fetchProfile(fallback.data.session.user.id)
      set({ isLoggedIn: true, currentUser: user ?? null })
      return { ok: true }
    }
    const user = await fetchProfile(data.session.user.id)
    set({ isLoggedIn: true, currentUser: user ?? null })
    return { ok: true }
  },

  resendSignupOtp: async (email) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    })
    if (error) {
      return { ok: false, error: normalizeErrorMessage(error.message) }
    }
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

  finishOnboarding: async (payload) => {
    const { currentUser } = get()
    if (!currentUser) return { ok: false, error: "Not logged in." }

    const supabase = createSupabaseBrowserClient()

    // Google sign-ups create a password here so they can later log in with
    // email/password or recover the account. Done first so a failure leaves
    // the profile untouched.
    if (payload.password) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: payload.password,
      })
      if (passwordError) return { ok: false, error: passwordError.message }
    }

    // Resolve account-type changes: switching to organization queues the
    // profile for admin verification (matching email signup behavior). Keep an
    // existing verification status if the type hasn't changed.
    let accountType = currentUser.accountType
    let organizationType: OrganizationType | null = currentUser.organizationType ?? null
    let verificationStatus: Profile["verification_status"] = currentUser.verificationStatus ?? null
    if (payload.accountType && payload.accountType !== currentUser.accountType) {
      accountType = payload.accountType
      organizationType =
        payload.accountType === "organization" && payload.organizationType
          ? payload.organizationType
          : null
      verificationStatus = payload.accountType === "organization" ? "pending" : null
    }

    const row: Partial<Profile> = {
      name: payload.name,
      state: payload.state,
      account_type: accountType,
      organization_type: organizationType,
      verification_status: verificationStatus,
      bio: payload.bio ?? null,
      is_private: payload.isPrivate,
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", currentUser.id)
      .select()
      .maybeSingle()
    if (error || !data) {
      return { ok: false, error: friendlyProfileError(error?.message ?? "") }
    }

    const updated = rowToUser(data as Profile)
    set({ currentUser: updated })
    useUserStore.setState((s) => ({ users: { ...s.users, [currentUser.id]: updated } }))
    return { ok: true }
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

  setPassword: async (password) => {
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
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
    if (authListenerSubscription) {
      authListenerSubscription.unsubscribe()
      authListenerSubscription = null
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
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
    authListenerSubscription = sub.subscription
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