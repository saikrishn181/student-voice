import { NextResponse } from "next/server"
import { generateSocialPostWithGemini, type SocialTheme } from "@/lib/ai/gemini"
import { publishInstagramPost } from "@/lib/social/instagram"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ROTATING_CAMPAIGNS = [
  "whistleblower",
  "hostel_mess",
  "fee_hike",
  "feature_spotlight",
  "strike_unity",
] as const

const ROTATING_THEMES: SocialTheme[] = [
  "midnight",
  "amber",
  "crimson",
  "emerald",
  "violet",
]

export async function POST(req: Request) {
  return handleAutoPost(req)
}

export async function GET(req: Request) {
  return handleAutoPost(req)
}

async function handleAutoPost(req: Request) {
  try {
    // 1. Secret authorization check if CRON_SECRET is defined
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
      const authHeader = req.headers.get("authorization")
      const url = new URL(req.url)
      const querySecret = url.searchParams.get("secret")

      if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
        return NextResponse.json({ ok: false, error: "Unauthorized cron execution." }, { status: 401 })
      }
    }

    // 2. Resolve credentials
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || ""
    const instagramAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || ""

    if (!accessToken || !instagramAccountId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Instagram credentials not configured in environment (INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID missing).",
        },
        { status: 400 },
      )
    }

    // 3. Choose campaign or fetch top real grievance from Supabase
    const randomIndex = Math.floor(Math.random() * ROTATING_CAMPAIGNS.length)
    const campaignType = ROTATING_CAMPAIGNS[randomIndex]
    const theme = ROTATING_THEMES[randomIndex]

    const supabase = await createSupabaseServerClient()
    const { data: topPosts } = await supabase
      .from("posts")
      .select("id, text, category, supports_count")
      .order("supports_count", { ascending: false })
      .limit(5)

    let sourcePost: { id: string; text: string; category?: string; supportsCount?: number } | undefined
    if (topPosts && topPosts.length > 0 && Math.random() > 0.5) {
      const p = topPosts[Math.floor(Math.random() * topPosts.length)]
      sourcePost = {
        id: p.id,
        text: p.text,
        category: p.category,
        supportsCount: p.supports_count,
      }
    }

    // 4. Generate with Google AI (Gemini)
    const postData = await generateSocialPostWithGemini({
      campaignType: sourcePost ? undefined : campaignType,
      sourcePost,
      theme,
    })

    // 5. Build query string for server-side dynamic card
    const host = req.headers.get("host") || "studentvoice.in"
    const protocol = host.includes("localhost") ? "http" : "https"
    const cardParams = new URLSearchParams({
      headline: postData.headline,
      subheadline: postData.subheadline,
      badge: postData.badge,
      b1: postData.bulletPoints[0] || "",
      b2: postData.bulletPoints[1] || "",
      b3: postData.bulletPoints[2] || "",
      stat: postData.statNumber,
      label: postData.statLabel,
      cta: postData.cta,
      theme: postData.colorTheme,
      handle: "@studentvoice.in",
    })

    const cardUrl = `${protocol}://${host}/api/social/card?${cardParams.toString()}`

    // 6. Fetch card PNG buffer and upload to Supabase Storage for high-speed public CDN
    let publicImageUrl = cardUrl
    try {
      const cardRes = await fetch(cardUrl)
      if (cardRes.ok) {
        const imageBuffer = Buffer.from(await cardRes.arrayBuffer())
        const fileName = `social/autopost-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.png`
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(fileName, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("post-media").getPublicUrl(fileName)
          publicImageUrl = urlData.publicUrl
        }
      }
    } catch {
      // Fallback to direct dynamic route URL if storage upload encounters network delay
    }

    // 7. Format full Instagram Caption
    const fullCaption = `${postData.caption}\n\n.\n.\n${(postData.hashtags || []).join(" ")}`

    // 8. Publish directly to Instagram feed
    const pubResult = await publishInstagramPost({
      accessToken,
      instagramAccountId,
      imageUrl: publicImageUrl,
      caption: fullCaption,
    })

    if (!pubResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: pubResult.error,
          post: postData,
          imageUrl: publicImageUrl,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      mediaId: pubResult.mediaId,
      permalink: pubResult.permalink,
      imageUrl: publicImageUrl,
      post: postData,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Autopost encountered unexpected error."
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
