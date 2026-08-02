import type { LucideIcon } from "lucide-react"
import { EmptyState } from "@/components/ui"

export function PhasePlaceholder({
  icon,
  title,
  phase,
}: {
  icon: LucideIcon
  title: string
  phase: string
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h2 text-slate-900">{title}</h1>
      <div className="surface-card">
        <EmptyState
          icon={icon}
          title={`${title} is coming in ${phase}`}
          description={`The ${title.toLowerCase()} experience will be built in the ${phase} of StudentVoice.`}
        />
      </div>
    </div>
  )
}