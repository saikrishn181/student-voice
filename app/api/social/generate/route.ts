import { NextResponse } from "next/server"
import { generateSocialPostWithGemini, type GeneratePostOptions } from "@/lib/ai/gemini"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeneratePostOptions

    const result = await generateSocialPostWithGemini({
      prompt: body.prompt,
      campaignType: body.campaignType,
      sourcePost: body.sourcePost,
      apiKey: body.apiKey,
      theme: body.theme,
    })

    return NextResponse.json({ ok: true, post: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate social media post."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
