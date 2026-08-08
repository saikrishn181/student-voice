"use client"

// Modal: centered on desktop, full-screen sheet on mobile. Closes on backdrop
// click and Escape. Traps keyboard focus while open and returns focus to the
// triggering element when closed. Renders into a portal attached to document.body.
import { useCallback, useEffect, useRef, type ReactNode } from "react"
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

// All focusable elements within the dialog.
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  // Remember which element had focus before the modal opened, so we can
  // return focus to it when the modal closes.
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement
      requestAnimationFrame(() => {
        // Focus the first focusable element inside the dialog.
        const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
        first?.focus()
      })
    } else if (previouslyFocused.current && previouslyFocused.current.isConnected) {
      previouslyFocused.current.focus()
    }
  }, [open])

  // Trap focus inside the dialog while open.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab") return

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!focusable || focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener("keydown", handleKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [open, handleKeyDown])

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