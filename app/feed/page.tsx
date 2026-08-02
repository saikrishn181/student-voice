"use client"

// Feed placeholder for Phase 2.
import { MessagesSquare } from "lucide-react"
import { EmptyState, Button } from "@/components/ui"
import { useAuthStore } from "@/lib/store/useAuthStore"

export default function FeedPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h2 text-slate-900">Feed</h1>
        <p className="text-body-sm text-slate-500">
          {currentUser ? `Welcome, ${currentUser.name}` : ""} — your local student feed.
        </p>
      </div>

      <div className="surface-card">
        <EmptyState
          icon={MessagesSquare}
          title="The feed is coming in Phase 2"
          description="This is where relevant problems from your region and category will appear. The Feed builder is part of the next phase of StudentVoice."
          action={<Button variant="outline" disabled>Coming soon</Button>}
        />
      </div>
    </div>
  )
}