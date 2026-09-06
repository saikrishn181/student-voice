"use client"

// Banned user suspension screen.
// Shown to users whose accounts have been banned after reaching 10 NSFW / community guideline strikes
// or receiving a temporary suspension.
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldAlert, LogOut, AlertTriangle, HelpCircle, Mail } from "lucide-react"
import { Button, Card } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import type { User } from "@/lib/types"

interface BannedUserScreenProps {
  user: User
}

export function BannedUserScreen({ user }: BannedUserScreenProps) {
  const router = useRouter()
  const logout = useAuthStore((s) => s.logout)
  const showToast = useToastStore((s) => s.show)
  const [loggingOut, setLoggingOut] = useState(false)

  const strikes = user.strikeCount ?? 10
  const isPermanent = !user.bannedUntil
  let remainingDays = 0
  let formattedUntil = ""

  if (user.bannedUntil) {
    const untilDate = new Date(user.bannedUntil)
    remainingDays = Math.max(1, Math.ceil((untilDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    formattedUntil = untilDate.toLocaleDateString(undefined, {
      dateStyle: "medium",
    })
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    setLoggingOut(false)
    showToast(s["toast.loggedOut"], "info")
    router.push("/login")
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-900/95 px-4 py-12 text-slate-100">
      <div className="mx-auto w-full max-w-lg">
        <Card className="flex flex-col items-center gap-6 border-red-500/30 bg-slate-900 p-6 text-center shadow-2xl sm:p-8">
          {/* Animated Warning Shield */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 ring-8 ring-red-500/20 animate-pulse">
            <ShieldAlert size={42} className="text-red-500" />
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="text-h2 font-bold text-white">Account Under Safety Review</h1>
            <p className="text-body-sm text-slate-300">
              Your posting access is temporarily paused to maintain a respectful, safe campus environment for all students.
            </p>
          </div>

          {/* Strikes visualization */}
          <div className="flex w-full flex-col gap-2.5 rounded-card border border-slate-800 bg-slate-950/80 p-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-400">Community Safety Status</span>
              <span className="text-red-400 font-bold">{strikes} / 10 Notice Points</span>
            </div>
            {/* Strike indicator bars */}
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i < strikes ? "bg-red-500 shadow-sm shadow-red-500/50" : "bg-slate-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Suspension details */}
          <div className="flex w-full flex-col gap-3 rounded-card border border-red-500/20 bg-red-950/20 p-4 text-left text-xs">
            <div className="flex items-center gap-2 font-semibold text-red-400">
              <AlertTriangle size={15} />
              <span>{isPermanent ? "Account Suspended" : `Temporary Restriction (${remainingDays} days remaining)`}</span>
            </div>
            <p className="text-slate-300">
              {user.banReason ??
                "This account received community reports regarding safety and guideline compliance."}
            </p>
            {!isPermanent && formattedUntil ? (
              <p className="text-slate-400">
                Access automatically restores on: <strong className="text-white">{formattedUntil}</strong>
              </p>
            ) : null}
          </div>

          <div className="text-body-sm text-slate-400">
            Krantind believes in restorative community moderation. If you believe this notice was issued in error or want to appeal with our student safety board, you can submit an instant review below.
          </div>

          {/* Actions */}
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <Button
              variant="danger"
              size="lg"
              loading={loggingOut}
              onClick={handleLogout}
              className="flex-1 gap-2"
            >
              <LogOut size={16} /> Log Out
            </Button>
            <a
              href="mailto:1krantind@gmail.com?subject=Account%20Ban%20Appeal"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-card border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition-app hover:bg-slate-700 hover:text-white"
            >
              <Mail size={16} /> Appeal Support
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
