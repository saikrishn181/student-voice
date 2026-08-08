"use client"

// Text/email/password/tel input with label, optional error message, and a
// show/hide toggle for password fields.
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: ReactNode
  error?: string
  leftAdornment?: ReactNode
  rightAdornment?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, id, type = "text", className, leftAdornment, rightAdornment, ...props },
  ref,
) {
  const generatedId = useId()
  const autoId = id || props.name || generatedId
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === "password"
  const resolvedType = isPassword ? (showPw ? "text" : "password") : type

  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {leftAdornment ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            {leftAdornment}
          </span>
        ) : null}
        <input
          ref={ref}
          id={autoId}
          type={resolvedType}
          className={cn(
            "h-11 w-full rounded-card border bg-white px-3.5 text-base text-slate-900 shadow-sm",
            "placeholder:text-slate-400 transition-app",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30",
            error
              ? "border-red-500 focus:border-red-500 focus:ring-red-500/30"
              : "border-slate-300",
            isPassword && "pr-12",
            leftAdornment && "pl-10",
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${autoId}-error` : undefined}
          {...props}
        />

        {error ? (
          <p
            id={`${autoId}-error`}
            className="mt-1.5 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {isPassword ? (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Hide password" : "Show password"}
            className="transition-app absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
            style={{ minHeight: 44, minWidth: 44 }}
          >
            {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        ) : null}

        {rightAdornment}
      </div>
    </div>
  )
})