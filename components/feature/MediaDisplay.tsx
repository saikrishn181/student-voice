"use client"

// Renders photo/video while preserving aspect ratio without knowing dimensions
// in advance:
//   - Photos: next/image with fill inside a container whose aspect-ratio is set
//     from naturalWidth/naturalHeight read on `onLoad`.
//   - Videos: videoWidth/videoHeight read via `onLoadedMetadata`.
// A Skeleton shows until dimensions are known. Displayed height is capped at
// 500px mobile / 600px desktop regardless of ratio, using `object-fit: contain`.
import Image from "next/image"
import { useCallback, useRef, useState } from "react"
import { Skeleton } from "@/components/ui/Skeleton"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { MediaType } from "@/lib/types"

interface MediaDisplayProps {
  mediaUrl: string
  mediaType: Exclude<MediaType, null>
  /** Optional pre-known ratio so we can render without a Skeleton flash. */
  knownAspectRatio?: number | null
  className?: string
}

const FALLBACK_RATIO = 16 / 9

export function MediaDisplay({
  mediaUrl,
  mediaType,
  knownAspectRatio,
  className,
}: MediaDisplayProps) {
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
      if (videoWidth > 0 && videoHeight > 0 && !measuredRef.current) {
        measuredRef.current = true
        setAspect(videoWidth / videoHeight)
      }
    },
    [],
  )

  const ratio = aspect ?? FALLBACK_RATIO
  const revealed = aspect !== null

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-card bg-slate-100", className)}
      style={{ aspectRatio: ratio, maxHeight: 500 }}
    >
      {/* Desktop raises the cap via a container-level media query overlay */}
      <div className="absolute inset-0 max-h-[500px] lg:max-h-[600px]">
        {!revealed ? (
          <div className="absolute inset-0">
            <Skeleton className="h-full w-full rounded-none" />
          </div>
        ) : null}

        {mediaType === "photo" ? (
          <Image
            src={mediaUrl}
            alt={s["media.alt"]}
            fill
            sizes="(max-width: 1024px) 100vw, 720px"
            className={cn("object-contain transition-opacity duration-fast", !revealed && "opacity-0")}
            onLoad={handleImageLoad}
            unoptimized
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            muted
            playsInline
            aria-label={s["media.alt"]}
            className={cn("h-full w-full object-contain", !revealed && "opacity-0")}
            onLoadedMetadata={handleVideoMetadata}
          />
        )}
      </div>
    </div>
  )
}