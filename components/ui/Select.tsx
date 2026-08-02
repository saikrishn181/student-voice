"use client"

// Wrapper around a native <select> for accessible state/district/category
// pickers. Native select is the most reliable option dropdown on all platforms.
import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: ReactNode
  options: SelectOption[]
  placeholder?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, placeholder, error, className, id, ...props },
  ref,
) {
  const autoId = id || "select"
  return (
    <div className="flex w-full flex-col gap-1.5">
      {label ? (
        <label htmlFor={autoId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={autoId}
          className={cn(
            "h-11 w-full appearance-none rounded-card border bg-white px-3.5 text-base text-slate-900 shadow-sm transition-app",
            "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30",
            error ? "border-red-500" : "border-slate-300",
            !props.value && "text-slate-400",
            className,
          )}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={20}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
})