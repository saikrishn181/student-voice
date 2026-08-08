import { Card } from "@/components/ui/Card"
import { Skeleton } from "@/components/ui/Skeleton"

interface PostCardSkeletonProps {
  count?: number
  className?: string
}

export function PostCardSkeleton({ count = 3, className }: PostCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className={className}>
          {/* Header: avatar + name */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>

          {/* Tags */}
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-20 rounded-pill" />
            <Skeleton className="h-5 w-16 rounded-pill" />
          </div>

          {/* Text lines */}
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
            <Skeleton className="h-8 w-20 rounded-card" />
            <Skeleton className="h-8 w-16 rounded-card" />
          </div>
        </Card>
      ))}
    </>
  )
}