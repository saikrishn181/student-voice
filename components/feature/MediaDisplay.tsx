"use client"

// Renders photo/video while preserving aspect ratio without knowing dimensions
// in advance:
//   - Photos: next/image with fill inside a container whose aspect-ratio is set
//     from naturalWidth/naturalHeight read on `onLoad`.
//   - Videos: videoWidth/videoHeight read via `onLoadedMetadata`.
// mediaUrl may contain multiple space-separated image URLs (multi-image posts);
// those render as a swipeable carousel with dots + arrows.
// A Skeleton shows until dimensions are known. Displayed height is capped at
// 500px mobile / 600px desktop regardless of ratio, using `object-fit: contain`.
import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Skeleton } from "@/components/ui/Skeleton"
import s from "@/lib/strings"
import { cn, isSafeMediaUrl } from "@/lib/utils"
import type { MediaType } from "@/lib/types"

interface MediaDisplayProps {
  mediaUrl: string
  mediaType: Exclude<MediaType, null>
  /** Optional pre-known ratio so we can render without a Skeleton flash. */
  knownAspectRatio?: number | null
  className?: string
}

const FALLBACK_RATIO = 16 / 9

function splitMediaUrls(mediaUrl: string): string[] {
  return mediaUrl
    .split(" ")
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && isSafeMediaUrl(u))
}

export function MediaDisplay({
  mediaUrl,
  mediaType,
  knownAspectRatio,
  className,
}: MediaDisplayProps) {
  const urls = splitMediaUrls(mediaUrl)
  // Videos are always single-item; only photos can be multi.
  const isCarousel = mediaType === "photo" && urls.length > 1
  const [index, setIndex] = useState(0)
  const [aspect, setAspect] = useState<number | null>(
    knownAspectRatio && knownAspectRatio > 0 ? knownAspectRatio : null,
  )
  const measuredRef = useRef(false)

  const handleImageLoad = useCallback(
    (ev: React.SyntheticEvent<HTMLImageElement>) => {
      const { naturalWidth, naturalHeight } = ev.currentTarget
      if (naturalWidth > 0 && naturalHeight > 0 && !measuredRef.current) {
        measuredRef.current = true
        setAspect(naturalWidth / naturalHeight)
      }
    },
    [],
  )

  const handleVideoMetadata = useCallback(
    (ev: React.SyntheticEvent<HTMLVideoElement>) => {
      const { videoWidth, videoHeight } = ev.currentTarget
      if (videoWidth > 0 && videoHeight > 0) {
        measuredRef.current = true
        setAspect(videoWidth / videoHeight)
      } else if (!measuredRef.current) {
        measuredRef.current = true
        setAspect(FALLBACK_RATIO)
      }
    },
    [],
  )

  const handleVideoError = useCallback(() => {
    measuredRef.current = true
    setAspect(FALLBACK_RATIO)
  }, [])

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + urls.length) % urls.length)
  }

  const ratio = aspect ?? FALLBACK_RATIO
  const revealed = aspect !== null
  const current = urls[Math.min(index, urls.length - 1)] ?? urls[0]

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-card bg-slate-100", className)}
      style={{ aspectRatio: ratio, maxHeight: 500 }}
    >
      {/* Desktop raises the cap via a container-level media query overlay */}
      <div className="absolute inset-0 max-h-[500px] lg:max-h-[600px]">
        {!revealed && mediaType === "photo" ? (
          <div className="absolute inset-0">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        ) : null}

        {mediaType === "photo" ? (
          <Image
            key={current}
            src={current}
            alt={s["media.alt"]}
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            className={cn("object-contain transition-opacity duration-fast", !revealed && "opacity-0")}
            onLoad={handleImageLoad}
            unoptimized
          />
        ) : (
          <video
            key={current}
            src={current}
            controls
            preload="metadata"
            playsInline
            aria-label={s["media.alt"]}
            className="h-full w-full object-contain"
            onLoadedMetadata={handleVideoMetadata}
            onLoadedData={handleVideoMetadata}
            onCanPlay={handleVideoMetadata}
            onError={handleVideoError}
          />
        )}

        {isCarousel ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={s["media.previous"]}
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white transition-app hover:bg-slate-900"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={s["media.next"]}
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white transition-app hover:bg-slate-900"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
              {urls.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={s["media.thumbnail"](i + 1)}
                  className={cn(
                    "h-2 w-2 rounded-full transition-app",
                    i === index ? "bg-white" : "bg-white/50 hover:bg-white/80",
                  )}
                />
              ))}
            </div>
            <span className="absolute bottom-2 right-2 rounded-pill bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-white">
              {index + 1}/{urls.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
