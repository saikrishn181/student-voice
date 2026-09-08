// Supabase Storage helper for post media. Requires a public bucket named
// `post-media` (see supabase/schema.sql). Returns the public URL after upload.
import { createSupabaseBrowserClient } from "@/lib/supabase/client"

export interface UploadResult {
  ok: boolean
  url?: string
  aspectRatio?: number
  error?: string
}

async function imageAspectRatio(file: File): Promise<number | null> {
  if (!file.type.startsWith("image/")) return null
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    if (img.width > 0 && img.height > 0) return img.width / img.height
    return null
  } catch {
    return null
  }
}

async function mediaAspectRatio(file: File): Promise<number | null> {
  if (file.type.startsWith("image/")) {
    return imageAspectRatio(file)
  }
  if (file.type.startsWith("video/")) {
    try {
      if (typeof window === "undefined") return 16 / 9
      return await new Promise<number | null>((resolve) => {
        const video = document.createElement("video")
        video.preload = "metadata"
        const blobUrl = URL.createObjectURL(file)
        video.onloadedmetadata = () => {
          URL.revokeObjectURL(blobUrl)
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            resolve(video.videoWidth / video.videoHeight)
          } else {
            resolve(16 / 9)
          }
        }
        video.onerror = () => {
          URL.revokeObjectURL(blobUrl)
          resolve(16 / 9)
        }
        video.src = blobUrl
      })
    } catch {
      return 16 / 9
    }
  }
  return null
}

export async function uploadPostMedia(file: File): Promise<UploadResult> {
  const supabase = createSupabaseBrowserClient()

  const rawExt = file.name.split(".").pop() || ""
  const safeExt =
    rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() ||
    (file.type.startsWith("video/") ? "mp4" : "jpg")

  const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`

  let contentType = file.type
  if (!contentType) {
    if (safeExt === "mp4") contentType = "video/mp4"
    else if (safeExt === "webm") contentType = "video/webm"
    else if (safeExt === "mov") contentType = "video/quicktime"
    else if (safeExt === "jpg" || safeExt === "jpeg") contentType = "image/jpeg"
    else if (safeExt === "png") contentType = "image/png"
    else contentType = "application/octet-stream"
  }

  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  })
  if (error) {
    return { ok: false, error: friendlyUploadError(error.message) }
  }

  const { data } = supabase.storage.from("post-media").getPublicUrl(path)
  const aspectRatio = await mediaAspectRatio(file)

  return { ok: true, url: data.publicUrl, aspectRatio: aspectRatio ?? undefined }
}

// Upload a profile avatar into the same public bucket under an `avatars/` path.
export async function uploadAvatar(file: File): Promise<UploadResult> {
  const supabase = createSupabaseBrowserClient()

  const rawExt = file.name.split(".").pop() || ""
  const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg"
  const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${safeExt}`

  let contentType = file.type
  if (!contentType || !contentType.startsWith("image/")) {
    if (safeExt === "png") contentType = "image/png"
    else if (safeExt === "webp") contentType = "image/webp"
    else if (safeExt === "gif") contentType = "image/gif"
    else contentType = "image/jpeg"
  }

  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  })
  if (error) {
    return { ok: false, error: friendlyUploadError(error.message) }
  }

  const { data } = supabase.storage.from("post-media").getPublicUrl(path)

  return { ok: true, url: data.publicUrl }
}

// Remove a previously uploaded file from storage so no orphaned media is left
// behind when a post is edited or deleted. Accepts any public URL of the
// `.../storage/v1/object/public/<bucket>/<path>` shape; no-ops for null/foreign
// URLs so legacy rows never break the delete flow.
export async function deletePostMedia(url?: string | null): Promise<void> {
  if (!url) return
  const marker = "/object/public/"
  const idx = url.indexOf(marker)
  if (idx === -1) return
  const full = url.slice(idx + marker.length)
  const slash = full.indexOf("/")
  if (slash === -1) return
  const bucket = full.slice(0, slash)
  const path = full.slice(slash + 1)
  const supabase = createSupabaseBrowserClient()
  await supabase.storage.from(bucket).remove([path])
}

function friendlyUploadError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("bucket")) return "Media bucket not found. Please ensure storage bucket is initialized."
  if (lower.includes("permission") || lower.includes("row-level security"))
    return "Upload failed — storage permissions error. Ensure bucket policies are enabled."
  if (lower.includes("payload too large") || lower.includes("entity too large") || lower.includes("size"))
    return "Video or media file exceeds maximum allowed size (50MB). Please select a smaller file."
  return message || "Upload failed. Please try again."
}