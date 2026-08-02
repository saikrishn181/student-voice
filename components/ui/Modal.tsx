"use client"

// Modal: centered on desktop, full-screen sheet on mobile. Closes on backdrop
// click and Escape. Renders into a portal attached to document.body.
import { useEffect, useRef, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  useEffect(() => {
    if (!mountedRef.current) return
    if (open) {
      // Focus the modal on open for a11y.
      requestAnimationFrame(() => dialogRef.current?.focus())
    }
  }, [open])

  const dialogRef = useRef<HTMLDivElement>(null)

  if (typeof window === "undefined" || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Dialog"}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Dialog surface */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={cn(
          "relative z-10 max-h-[92dvh] w-full overflow-y-auto scroll-slim rounded-t-card bg-white shadow-modal",
          "sm:w-auto sm:min-w-[26rem] sm:max-w-lg sm:rounded-card",
          className,
        )}
      >
        {title ? (
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 className="text-h4">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="transition-app -mr-1 -mt-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <X size={20} />
            </button>
          </div>
        ) : null}
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body,
  )
}