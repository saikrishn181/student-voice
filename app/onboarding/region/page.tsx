"use client"

// Region selection: shown right after signup. Two Selects (State then District)
// populate district options based on the selected state. Continue is disabled
// until both are chosen, then redirects to /feed.
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, MapPin } from "lucide-react"
import { Button, Select } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { STATES, getDistrictsForState, LOGGED_IN_HOME } from "@/constants"

export default function RegionPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const setRegion = useAuthStore((s) => s.setRegion)
  const showToast = useToastStore((s) => s.show)

  const [state, setState] = useState("")
  const [district, setDistrict] = useState("")

  // Prefill from an existing user profile if they've already chosen a region
  // (e.g. if they revisit this route after signing in again).
  useEffect(() => {
    if (currentUser?.state) {
      setState(currentUser.state)
      if (currentUser.district) setDistrict(currentUser.district)
    }
  }, [currentUser])

  // District options derived from the chosen state.
  const districtOptions = useMemo(() => {
    return getDistrictsForState(state).map((d) => ({ value: d, label: d }))
  }, [state])

  const canContinue = Boolean(state && district)

  const handleContinue = () => {
    if (!canContinue) {
      showToast("Please select both your state and district", "error")
      return
    }
    // TODO: persist region to Supabase profile, then navigate.
    setRegion(state, district)
    router.push(LOGGED_IN_HOME)
  }

  const stateOptions = STATES.map((s) => ({ value: s, label: s }))

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} />
          </span>
          <span className="text-xl font-bold text-primary-700">StudentVoice</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-50 text-primary-700">
            <MapPin size={22} />
          </span>
          <h1 className="mt-3 text-h2 text-slate-900">Where are you studying?</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            We&apos;ll show you problems from your region so support stays local. You can change
            this later.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Select
              label="State"
              options={stateOptions}
              placeholder="Select your state"
              value={state}
              onChange={(e) => {
                setState(e.target.value)
                setDistrict("") // reset district when state changes
              }}
              required
            />

            <Select
              label="District"
              options={districtOptions}
              placeholder="Select your district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!state}
              required
            />

            <Button
              size="lg"
              fullWidth
              disabled={!canContinue}
              onClick={handleContinue}
              className="mt-2"
            >
              Continue to Feed
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}