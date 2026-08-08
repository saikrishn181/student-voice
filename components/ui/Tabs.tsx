"use client";

// Tab bar used on signup (account type) and on profile pages later.
// Each tab has a proper aria-selected and the tabpanel association is handled
// by the parent component via role="tabpanel" on the content container.
import { useId, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface TabItem<T extends string = string> {
  value: T
  label: ReactNode
}

interface TabsProps<T extends string> {
  tabs: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: TabsProps<T>) {
  const groupId = useId()

  return (
    <div
      role="tablist"
      aria-label="Account type"
      className={cn("grid w-full auto-cols-fr grid-flow-col gap-1 rounded-card bg-slate-100 p-1", className)}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value
        const tabId = `${groupId}-${tab.value}`
        return (
          <button
            key={tab.value}
            id={tabId}
            role="tab"
            aria-selected={selected}
            aria-controls={`${groupId}-${tab.value}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              "transition-app h-10 rounded-card px-4 text-sm font-semibold",
              selected
                ? "bg-white text-primary-700 shadow-card"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}