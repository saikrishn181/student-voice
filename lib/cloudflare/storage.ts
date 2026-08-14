// Cloudflare R2 upload helpers (browser). The browser requests a signed URL
// from /api/storage/presign, then PUTs the file directly to R2 — credentials
// never leave the server. Same UploadResult interface as the old storage
// backend, so callers didn't need to change.
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
  return uploadFile(file, "posts")
}

export async function uploadAvatar(file: File): Promise<UploadResult> {
  return uploadFile(file, "avatars")
}

async function uploadFile(file: File, prefix: "posts" | "avatars"): Promise<UploadResult> {
  const supabase = createSupabaseBrowserClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "Upload failed — you need to be signed in." }
  }

  const res = await fetch("/api/storage/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, prefix, contentType: file.type }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.uploadUrl || !body.publicUrl) {
    return { ok: false, error: body.error ?? "Upload failed. Please try again." }
  }

  const put = await fetch(body.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  })
  if (!put.ok) {
    return { ok: false, error: "Upload failed — could not reach the storage server." }
  }

  const aspectRatio = await imageAspectRatio(file)
  return { ok: true, url: body.publicUrl, aspectRatio: aspectRatio ?? undefined }
}