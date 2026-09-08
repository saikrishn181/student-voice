import { NextResponse } from "next/server"
import { publishInstagramPost } from "@/lib/social/instagram"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      imageUrl?: string
      imageBase64?: string
      caption?: string
      accessToken?: string
      instagramAccountId?: string
    }

    const accessToken = body.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || ""
    const instagramAccountId = body.instagramAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ""

    if (!accessToken || !instagramAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing Instagram credentials. Please provide Meta Access Token and Instagram Business Account ID.",
        },
        { status: 400 },
      )
    }

    let finalImageUrl = body.imageUrl || ""

    // If client sent a base64 encoded image from the canvas, upload it to Supabase Storage
    if (!finalImageUrl && body.imageBase64) {
      try {
        const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, "")
        const buffer = Buffer.from(base64Data, "base64")
        const fileName = `social/insta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`

        const supabase = await createSupabaseServerClient()
        const { error: uploadError } = await supabase.storage.from("post-media").upload(fileName, buffer, {
          contentType: "image/png",
          upsert: true,
        })

        if (uploadError) {
          return NextResponse.json(
            { ok: false, error: `Failed to host image for Instagram: ${uploadError.message}` },
            { status: 500 },
          )
        }

        const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(fileName)
        finalImageUrl = urlData.publicUrl
      } catch (uploadErr: unknown) {
        const msg = uploadErr instanceof Error ? uploadErr.message : "Failed to process image buffer."
        return NextResponse.json({ ok: false, error: msg }, { status: 500 })
      }
    }

    if (!finalImageUrl) {
      return NextResponse.json(
        { ok: false, error: "No image provided. Please provide an image URL or imageBase64." },
        { status: 400 },
      )
    }

    const result = await publishInstagramPost({
      accessToken,
      instagramAccountId,
      imageUrl: finalImageUrl,
      caption: body.caption || "",
    })

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, imageUrl: finalImageUrl }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      mediaId: result.mediaId,
      permalink: result.permalink,
      imageUrl: finalImageUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected failure publishing to Instagram."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
