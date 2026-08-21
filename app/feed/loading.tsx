import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { Skeleton } from "@/components/ui/Skeleton"

export default function FeedLoading() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-16 rounded-pill" />
          <Skeleton className="h-7 w-16 rounded-pill" />
          <Skeleton className="h-7 w-20 rounded-pill" />
        </div>
        <PostCardSkeleton count={3} />
      </div>
      <div className="hidden lg:flex flex-col gap-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  )
}
