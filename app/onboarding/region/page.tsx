"use client"

// Region selection: shown right after signup. A single State Select decides
// the user's region. Continue is disabled until one is chosen, then redirects.
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Megaphone, MapPin } from "lucide-react"
import { Button, Select } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import { STATES, LOGGED_IN_HOME } from "@/constants"
import s from "@/lib/strings"

export default function RegionPage() {
  const router = useRouter()
  const currentUser = useAuthStore((s) => s.currentUser)
  const setRegion = useAuthStore((s) => s.setRegion)
  const showToast = useToastStore((s) => s.show)

  const [state, setState] = useState("")

  // Prefill from an existing user profile if they've already chosen a region
  // (e.g. if they revisit this route after signing in again).
  useEffect(() => {
    if (currentUser?.state) setState(currentUser.state)
  }, [currentUser])

  const canContinue = Boolean(state)

  const handleContinue = async () => {
    if (!canContinue) {
      showToast(s["validation.regionRequired"], "error")
      return
    }
    await setRegion(state)
    router.push(LOGGED_IN_HOME)
  }

  const stateOptions = STATES.map((st) => ({ value: st, label: st }))

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-primary-700 text-white">
            <Megaphone size={20} aria-hidden />
          </span>
          <span className="text-xl font-bold text-primary-700">{s["app.name"]}</span>
        </div>

        <div className="surface-card p-6 sm:p-8">
          <span className="flex h-11 w-11 items-center justify-center rounded-card bg-primary-50 text-primary-700">
            <MapPin size={22} aria-hidden />
          </span>
          <h1 className="mt-3 text-h2 text-slate-900">{s["onboarding.region.title"]}</h1>
          <p className="mt-1 text-body-sm text-slate-500">
            {s["onboarding.region.description"]}
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <Select
              label={s["onboarding.region.stateLabel"]}
              options={stateOptions}
              placeholder={s["onboarding.region.statePlaceholder"]}
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />

            <Button
              size="lg"
              fullWidth
              disabled={!canContinue}
              onClick={handleContinue}
              className="mt-2"
            >
              {s["onboarding.region.continue"]}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}