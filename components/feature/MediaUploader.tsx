"use client"

// MediaUploader: drag-and-drop / file-picker for post media.
//  - Accepts only image/* and video/* (rejects others + max 50MB with Toast).
//  - Shows a live preview via MediaDisplay's shared aspect-ratio logic.
//  - The actual upload happens on form submit (single flight, no orphans);
//    blob URLs are strictly preview and are revoked on remove/replace/unmount.
//  - Allows removing the selected file / picking a replacement.
import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useToastStore } from "@/lib/store/useToastStore"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import { MediaDisplay } from "./MediaDisplay"

const MAX_FILE_SIZE_MB = 50

export interface PickedMedia {
  url: string
  type: "photo" | "video"
  file: File
}

interface MediaUploaderProps {
  value: PickedMedia | null
  onChange: (media: PickedMedia | null) => void
}

export function MediaUploader({ value, onChange }: MediaUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const lastBlobRef = useRef<string | null>(null)
  const showToast = useToastStore((s) => s.show)
  const [dragging, setDragging] = useState(false)

  // Replaces the previous preview with a new one, revoking the old blob URL
  // so it can never leak.
  const replaceBlob = (url: string | null) => {
    if (lastBlobRef.current === url) return
    if (lastBlobRef.current) URL.revokeObjectURL(lastBlobRef.current)
    lastBlobRef.current = url
  }

  // On unmount (user navigates away) release every object URL this picker
  // created, so memory is freed even if the form was never submitted.
  useEffect(() => {
    return () => {
      if (lastBlobRef.current) URL.revokeObjectURL(lastBlobRef.current)
      lastBlobRef.current = null
    }
  }, [])

  const handleFile = (file: File | undefined | null) => {
    if (!file) return

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      showToast(s["validation.fileType"], "error")
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      showToast(s["validation.fileSize"], "error")
      return
    }

    // Preview only — the real upload runs once on publish.
    const url = URL.createObjectURL(file)
    replaceBlob(url)
    const kind = file.type.startsWith("video/") ? "video" : "photo"
    onChange({ url, type: kind, file })
  }

  const handleRemove = () => {
    replaceBlob(null)
    onChange(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {value ? (
        <div className="relative overflow-hidden rounded-card border border-slate-200 bg-slate-100">
          <MediaDisplay mediaUrl={value.url} mediaType={value.type} />
          {value.url.startsWith("blob:") ? (
            <span className="absolute bottom-2 right-2 rounded-pill bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
              {s["media.uploader.previewOnly"]}
            </span>
          ) : null}
          <button
            type="button"
            onClick={handleRemove}
            aria-label={s["media.uploader.remove"]}
            className="transition-app absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
          >
            <X size={18} />
          </button>
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
            handleFile(e.dataTransfer.files?.[0])
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
        className="hidden"
        aria-hidden
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      {value ? (
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          {s["createPost.replaceFile"]}
        </Button>
      ) : (
        <span className="sr-only">{s["media.uploader.label"]}</span>
      )}
    </div>
  )
}