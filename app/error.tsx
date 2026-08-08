"use client"

// App-level error boundary (Next.js App Router): catches render errors in the
// route segment and shows a friendly fallback with a retry option instead of
// a blank page. Nested under the layout so the Navbar stays visible when usable.
import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Route error:", error)
  }, [error])

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-card bg-red-100 text-red-600">
        <AlertTriangle size={28} aria-hidden />
      </span>
      <h1 className="text-h2 text-slate-900">Something went wrong</h1>
      <p className="mt-2 max-w-sm text-body-sm text-slate-500">
        An unexpected error occurred while loading this page. Please try again.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/feed")}>
          Back to Feed
        </Button>
      </div>
    </div>
  )
}