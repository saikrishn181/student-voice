"use client"

// Multi-line text input, styled like the rest of the Input family. Used for
// post bodies and long-form fields.
import { forwardRef, type TextareaHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, rows = 4, ...props },
  ref,
) {
  const autoId = id || props.name || "textarea"
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <textarea
        ref={ref}
        id={autoId}
        rows={rows}
        className={cn(
          "w-full resize-y rounded-card border bg-white px-3.5 py-2.5 text-base text-slate-900 shadow-sm transition-app",
          "placeholder:text-slate-400",
          "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30",
          error ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : "border-slate-300",
          className,
        )}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${autoId}-error` : undefined}
        {...props}
      />

      {error ? (
        <p id={`${autoId}-error`} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})