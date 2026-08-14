// POST /api/storage/presign — generates a short-lived signed upload URL for
// Cloudflare R2. The browser never sees R2 credentials; it just PUTs the file
// to the signed URL. Requires a signed-in Supabase session.
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { createPresignedUploadUrl, publicUrl } from "@/lib/cloudflare/r2"

const ALLOWED_PREFIXES = ["posts/", "avatars/"]

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Sign in to upload files." }, { status: 401 })
  }

  let body: { fileName?: string; prefix?: string; contentType?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const prefix = body.prefix
  const fileName = body.fileName
  const contentType = body.contentType

  if (!ALLOWED_PREFIXES.includes(prefix ?? "")) {
    return NextResponse.json({ error: "Invalid upload prefix." }, { status: 400 })
  }
  if (!fileName || typeof fileName !== "string" || fileName.includes("/")) {
    return NextResponse.json({ error: "Invalid file name." }, { status: 400 })
  }
  if (fileName.length > 100) {
    return NextResponse.json({ error: "File name too long." }, { status: 400 })
  }

  // Extension allowlist — only images (and common video) are ever uploaded.
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  if (!["jpg", "jpeg", "png", "gif", "webp", "avif", "heic", "mp4", "webm"].includes(ext)) {
    return NextResponse.json({ error: "File type not allowed." }, { status: 400 })
  }

  const path = `${prefix}${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`

  try {
    const uploadUrl = await createPresignedUploadUrl(path, contentType || "application/octet-stream")
    return NextResponse.json({ uploadUrl, publicUrl: publicUrl(path) })
  } catch (err) {
    console.error("presign failed:", err)
    return NextResponse.json({ error: "Could not prepare upload — check R2 env config." }, { status: 500 })
  }
}