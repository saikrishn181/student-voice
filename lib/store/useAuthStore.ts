"use client"

// Auth state, entirely mocked for Phase 1 (no real backend).
//
// TODO: persist session with Supabase auth; this currently resets on refresh.
import { create } from "zustand"

import { MOCK_STUDENT } from "@/lib/mockData"
import type { AccountType, OrganizationType, User } from "@/lib/types"

export interface SignupPayload {
  name: string
  email: string
  accountType: AccountType
  organizationType?: OrganizationType
}

interface AuthState {
  isLoggedIn: boolean
  currentUser: User | null

  login: (email: string) => void
  signup: (payload: SignupPayload) => void
  setRegion: (state: string, district: string) => void
  logout: () => void
}

let counter = 0

// TODO: replace with real Supabase sign-in. Currently always treats any provided
// email as valid and fabricates a session that resets on refresh.
export const useAuthStore = create<AuthState>()((set) => ({
  isLoggedIn: false,
  currentUser: null,

  login: (email) =>
    set({
      isLoggedIn: true,
      currentUser: {
        ...MOCK_STUDENT,
        id: `usr_${++counter}`,
        email,
      },
    }),

  signup: (payload) =>
    set({
      isLoggedIn: true,
      currentUser: {
        id: `usr_${++counter}`,
        name: payload.name,
        email: payload.email,
        accountType: payload.accountType,
        organizationType:
          payload.accountType === "organization" ? payload.organizationType : undefined,
        // Organizations start unverified; this drives the Phase 3 flow.
        verificationStatus:
          payload.accountType === "organization" ? "pending" : undefined,
        createdAt: new Date().toISOString(),
      },
    }),

  setRegion: (state, district) =>
    set(({ currentUser }) =>
      currentUser
        ? {
            currentUser: { ...currentUser, state, district },
          }
        : {},
    ),

  logout: () =>
    set({
      isLoggedIn: false,
      currentUser: null,
    }),
}))