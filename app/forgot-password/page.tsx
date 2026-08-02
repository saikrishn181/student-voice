import Link from "next/link"
import { Megaphone } from "lucide-react"
import { Button } from "@/components/ui"

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-primary-700 text-white">
        <Megaphone size={28} />
      </span>
      <h1 className="text-h2 text-slate-900">Coming soon</h1>
      <p className="mt-2 max-w-sm text-body-sm text-slate-500">
        Password reset will be available once StudentVoice is connected to a real
        backend in a later phase.
      </p>
      <div className="mt-6">
        <Link href="/login">
          <Button>Back to Log In</Button>
        </Link>
      </div>
    </div>
  )
}