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

export async function uploadPostMedia(file: File): Promise<UploadResult> {
  const supabase = createSupabaseBrowserClient()

  const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${file.name.split(".").pop()}`

  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  })
  if (error) {
    return { ok: false, error: friendlyUploadError(error.message) }
  }

  const { data } = supabase.storage.from("post-media").getPublicUrl(path)
  const aspectRatio = await imageAspectRatio(file)

  return { ok: true, url: data.publicUrl, aspectRatio: aspectRatio ?? undefined }
}

// Upload a profile avatar into the same public bucket under an `avatars/` path.
export async function uploadAvatar(file: File): Promise<UploadResult> {
  const supabase = createSupabaseBrowserClient()

  const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${file.name.split(".").pop()}`

  const { error } = await supabase.storage.from("post-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
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
  if (message.includes("bucket")) return "Media bucket not found. Run supabase/schema.sql first."
  if (message.toLowerCase().includes("permission")) return "Upload failed — you need to be signed in."
  return message || "Upload failed. Please try again."
}