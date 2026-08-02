"use client"

// Renders the global toast stack, fixed at the top. Reads from the toast store,
// so any page can call `toast.success/error/info`.
import { CheckCircle2, Info, AlertCircle, X } from "lucide-react"
import { useToastStore, toast } from "@/lib/store/useToastStore"
import { cn } from "@/lib/utils"
import type { ToastKind } from "@/lib/types"

export { toast }

const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const toneMap: Record<ToastKind, string> = {
  success: "border-green-200 text-green-700",
  error: "border-red-200 text-red-700",
  info: "border-blue-200 text-blue-700",
}

const iconTone: Record<ToastKind, string> = {
  success: "text-green-500",
  error: "text-red-500",
  info: "text-blue-500",
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = iconMap[t.kind]
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-card border bg-white p-3.5 shadow-popover",
              toneMap[t.kind],
            )}
          >
            <Icon size={20} className={cn("mt-0.5 shrink-0", iconTone[t.kind])} aria-hidden />
            <p className="flex-1 text-sm font-medium text-slate-700">{t.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="transition-app rounded-md p-1 text-slate-400 hover:text-slate-600"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}