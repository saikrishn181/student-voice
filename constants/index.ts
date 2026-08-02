// Fixed application values (states/districts, categories, organization types).
// FIXED constant set reused by auth/onboarding and future feed phases.

import type { CategoryId, OrganizationType } from "@/lib/types"

// Regions for the onboarding/region page. Store as an array so order is stable.
// TODO: replace with an API/database of Indian states & districts in a later phase.
export const REGIONS: { state: string; districts: string[] }[] = [
  {
    state: "Maharashtra",
    districts: [
      "Mumbai",
      "Pune",
      "Nagpur",
      "Nashik",
      "Thane",
    ],
  },
  {
    state: "Karnataka",
    districts: ["Bengaluru", "Mysuru", "Belagavi", "Hubballi"],
  },
  {
    state: "Delhi",
    districts: ["Central Delhi", "North Delhi", "South Delhi", "West Delhi"],
  },
  {
    state: "Tamil Nadu",
    districts: ["Chennai", "Coimbatore", "Madurai", "Salem"],
  },
  {
    state: "Uttar Pradesh",
    districts: ["Lucknow", "Kanpur", "Varanasi", "Noida"],
  },
  {
    state: "West Bengal",
    districts: ["Kolkata", "Howrah", "Durgapur", "Siliguri"],
  },
]

// Flat list of all state names (for the State Select).
export const STATES = REGIONS.map((r) => r.state)

// Given a state name, return its districts (the District Select options).
export function getDistrictsForState(state: string): string[] {
  const found = REGIONS.find((r) => r.state === state)
  return found ? found.districts : []
}

// Account types offered at signup.
export const ACCOUNT_TYPES = ["student", "organization"] as const

// Organization type options with human labels + icons (lucide) later phases.
export const ORGANIZATION_TYPES: {
  value: OrganizationType
  label: string
}[] = [
  { value: "student_union", label: "Student Union" },
  { value: "ngo", label: "NGO" },
  { value: "coaching_institute", label: "Coaching Institute" },
  { value: "campus_club", label: "Campus Club" },
  { value: "other", label: "Other" },
]

// List of post categories (used by feed filters in Phase 2, and by the
// CategoryTag badge in later phases).
export const CATEGORIES: {
  id: CategoryId
  label: string
  emoji: string
}[] = [
  { id: "education", label: "Education", emoji: "📚" },
  { id: "campus", label: "Campus", emoji: "🏫" },
  { id: "transport", label: "Transport", emoji: "🚌" },
  { id: "hostel", label: "Hostel & Food", emoji: "🏠" },
  { id: "fees", label: "Fees & Funds", emoji: "💰" },
  { id: "other", label: "Other", emoji: "✳️" },
]

// The default Redirect target after a successful login (user already has a region).
export const LOGGED_IN_HOME = "/feed"

// Redirect target right after a fresh signup (region not set yet).
export const POST_SIGNUP_ROUTE = "/onboarding/region"