import Link from "next/link"
import { Compass, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 shadow-sm">
        <Compass size={32} aria-hidden />
      </span>
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-body-sm text-slate-500">
        Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href="/feed">
          <Button leftIcon={<ArrowLeft size={16} aria-hidden />}>
            Back to Feed
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Home</Button>
        </Link>
      </div>
    </div>
  )
}
