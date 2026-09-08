import { NextResponse } from "next/server"
import { verifyInstagramCredentials } from "@/lib/social/instagram"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { accessToken?: string; instagramAccountId?: string }

    const accessToken = body.accessToken || process.env.INSTAGRAM_ACCESS_TOKEN || ""
    const instagramAccountId = body.instagramAccountId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ""

    if (!accessToken || !instagramAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please provide both Meta Access Token and Instagram Business Account ID.",
        },
        { status: 400 },
      )
    }

    const result = await verifyInstagramCredentials(accessToken, instagramAccountId)
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true, account: result.account })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to verify Instagram account."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
