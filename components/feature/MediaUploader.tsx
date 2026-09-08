"use client"

// MediaUploader: drag-and-drop / file-picker for post media.
//  - Accepts only image/* and video/* (rejects others + max 50MB with Toast).
//  - Up to 4 photos OR a single video can be selected (never mixed).
//  - Shows live previews via MediaDisplay's shared aspect-ratio logic.
//  - The actual upload happens on form submit (single flight, no orphans);
//    blob URLs are strictly preview and are revoked on remove/replace/unmount.
import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import { MediaDisplay } from "./MediaDisplay"

const MAX_FILE_SIZE_MB = 50
const MAX_PHOTOS = 4

export interface PickedMedia {
  url: string
  type: "photo" | "video"
  file: File
}

interface MediaUploaderProps {
  value: PickedMedia[]
  onChange: (media: PickedMedia[]) => void
}

export function MediaUploader({ value, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const blobRefs = useRef<string[]>([])
  const showToast = useToastStore((s) => s.show)
  const [dragging, setDragging] = useState(false)

  // Tracks every blob URL this picker created so they can all be revoked.
  const rememberBlob = (url: string) => {
    if (!blobRefs.current.includes(url)) blobRefs.current.push(url)
  }

  // On unmount (user navigates away) release every object URL this picker
  // created, so memory is freed even if the form was never submitted.
  useEffect(() => {
    return () => {
      blobRefs.current.forEach((u) => URL.revokeObjectURL(u))
      blobRefs.current = []
    }
  }, [])

  const addFiles = (files: File[]) => {
    const picked: PickedMedia[] = []
    for (const file of files) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        showToast(s["validation.fileType"], "error")
        return
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        showToast(s["validation.fileSize"], "error")
        return
      }
      picked.push({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("video/") ? "video" : "photo",
        file,
      })
    }
    if (picked.length === 0) return

    const hasVideo = value.some((m) => m.type === "video") || picked.some((m) => m.type === "video")
    if (hasVideo) {
      // Video is always single. Clear any previously selected media.
      value.forEach((m) => URL.revokeObjectURL(m.url))
      const videoItem = picked.find((m) => m.type === "video") || picked[0]
      // Revoke any other picked files if user selected multiple files together with video
      picked.filter((m) => m !== videoItem).forEach((m) => URL.revokeObjectURL(m.url))
      rememberBlob(videoItem.url)
      onChange([videoItem])
      return
    }
    const combined = [...value, ...picked].slice(0, MAX_PHOTOS)
    if (combined.length < value.length + picked.length) {
      showToast(s["media.uploader.maxPhotos"](MAX_PHOTOS), "error")
    }
    picked.forEach((m) => rememberBlob(m.url))
    onChange(combined)
  }

  const handleRemove = (index: number) => {
    const next = value.filter((_, i) => i !== index)
    onChange(next)
  }

  const hasVideo = value.some((m) => m.type === "video")

  return (
    <div className="flex flex-col gap-3">
      {value.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {value.map((media, index) => (
            <div
              key={media.url}
              className="relative overflow-hidden rounded-card border border-slate-200 bg-slate-100"
            >
              <MediaDisplay
                mediaUrl={media.url}
                mediaType={media.type}
                knownAspectRatio={value.length === 1 ? undefined : 4 / 3}
                className={value.length > 1 ? "max-h-60" : undefined}
              />
              {media.url.startsWith("blob:") ? (
                <span className="absolute bottom-2 right-2 rounded-pill bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
                  {s["media.uploader.previewOnly"]}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={s["media.uploader.remove"]}
                className="transition-app absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            addFiles(Array.from(e.dataTransfer.files ?? []))
          }}
          className={cn(
            "flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center",
            "transition-app cursor-pointer",
            dragging
              ? "border-primary-500 bg-primary-50"
              : "border-slate-300 bg-white hover:border-primary-400 hover:bg-slate-50",
          )}
        >
          <ImagePlus size={28} className="text-slate-400" aria-hidden />
          <span className="text-sm font-semibold text-slate-700">
            {s["media.uploader.dragDrop"]}
          </span>
          <span className="text-xs text-slate-400">
            {s["media.uploader.formats"](MAX_FILE_SIZE_MB)}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple={!hasVideo}
        className="hidden"
        aria-hidden
        onChange={(e) => {
          addFiles(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />

      {value.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            {hasVideo ? s["createPost.replaceFile"] : s["media.uploader.addMore"](MAX_PHOTOS - value.length)}
          </Button>
        </div>
      ) : (
        <span className="sr-only">{s["media.uploader.label"]}</span>
      )}
    </div>
  )
}
