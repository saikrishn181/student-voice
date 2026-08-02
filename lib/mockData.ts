// Centralized mock/dummy data. Everything here is placeholder data that a real
// backend (Supabase) will replace in later phases.
import type { User } from "@/lib/types"

// A single sample user used for the mock "already registered" login path.
export const MOCK_STUDENT: User = {
  id: "usr_demo",
  name: "Ananya Sharma",
  email: "ananya@example.com",
  accountType: "student",
  avatarUrl:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=60",
  state: "Maharashtra",
  district: "Mumbai",
  createdAt: "2026-01-15T09:00:00.000Z",
}

// Used to make the login form accept a known emali/account for demo purposes.
export const DEMO_LOGIN = {
  email: "ananya@example.com",
  password: "demo1234",
}

// Used by the onboarding region page to stock the two Selects if no user state
// region exists yet. Currently shadowed by REGIONS from /constants.
export const MOCK_REGIONS = [
  { state: "Maharashtra", districts: ["Mumbai", "Pune", "Nagpur"] },
]