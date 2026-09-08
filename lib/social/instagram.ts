// Meta Instagram Graph API client for publishing automated posts to an Instagram Professional account.

export interface InstagramAccountInfo {
  id: string
  username: string
  name?: string
  profilePictureUrl?: string
}

export interface InstagramVerifyResult {
  ok: boolean
  account?: InstagramAccountInfo
  error?: string
}

export interface InstagramPublishParams {
  accessToken: string
  instagramAccountId: string
  imageUrl: string
  caption: string
}

export interface InstagramPublishResult {
  ok: boolean
  creationId?: string
  mediaId?: string
  permalink?: string
  error?: string
}

const GRAPH_API_VERSION = "v20.0"
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Validates Meta access token and Instagram Business/Creator account ID.
 * Returns account details or friendly error if invalid.
 */
export async function verifyInstagramCredentials(
  accessToken: string,
  instagramAccountId: string,
): Promise<InstagramVerifyResult> {
  const token = accessToken.trim()
  const accountId = instagramAccountId.trim()

  if (!token) {
    return { ok: false, error: "Meta Instagram Access Token is missing." }
  }
  if (!accountId) {
    return { ok: false, error: "Instagram Business/Creator Account ID is missing." }
  }

  try {
    const url = `${GRAPH_BASE}/${encodeURIComponent(accountId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(token)}`
    const res = await fetch(url, { method: "GET" })
    const data = await res.json()

    if (!res.ok || data.error) {
      const msg = data.error?.message || "Invalid credentials or unauthorized."
      return { ok: false, error: friendlyInstagramError(msg) }
    }

    return {
      ok: true,
      account: {
        id: data.id,
        username: data.username || "instagram_user",
        name: data.name,
        profilePictureUrl: data.profile_picture_url,
      },
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error reaching Meta Graph API."
    return { ok: false, error: message }
  }
}

/**
 * Two-phase publication pipeline for Instagram Single Image posts:
 * Step 1: POST /{ig-user-id}/media -> returns creation_id (container)
 * Step 2: Poll container status until ready (FINISHED)
 * Step 3: POST /{ig-user-id}/media_publish -> posts live on Instagram
 * Step 4: GET /{media-id}?fields=permalink -> returns the live post URL
 */
export async function publishInstagramPost({
  accessToken,
  instagramAccountId,
  imageUrl,
  caption,
}: InstagramPublishParams): Promise<InstagramPublishResult> {
  const token = accessToken.trim()
  const accountId = instagramAccountId.trim()

  if (!token || !accountId) {
    return { ok: false, error: "Missing Instagram credentials. Please provide Access Token and Account ID." }
  }
  if (!imageUrl || !imageUrl.startsWith("http")) {
    return { ok: false, error: "Invalid public image URL. Image must be hosted on a public HTTPS endpoint." }
  }

  try {
    // 1. Create Media Container
    const containerEndpoint = `${GRAPH_BASE}/${encodeURIComponent(accountId)}/media`
    const containerParams = new URLSearchParams({
      image_url: imageUrl,
      caption: caption || "",
      access_token: token,
    })

    const createRes = await fetch(`${containerEndpoint}?${containerParams.toString()}`, {
      method: "POST",
    })
    const createData = await createRes.json()

    if (!createRes.ok || !createData.id) {
      const err = createData.error?.message || "Failed to create Instagram media container."
      return { ok: false, error: friendlyInstagramError(err) }
    }

    const creationId = createData.id as string

    // 2. Status check (wait up to 10 seconds for Meta CDN to fetch & process the image)
    let isReady = false
    let attempts = 0
    while (!isReady && attempts < 5) {
      attempts++
      const statusRes = await fetch(
        `${GRAPH_BASE}/${encodeURIComponent(creationId)}?fields=status_code,status&access_token=${encodeURIComponent(token)}`,
      )
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.status_code === "FINISHED") {
          isReady = true
          break
        }
        if (statusData.status_code === "ERROR") {
          return { ok: false, error: `Meta image processing failed: ${statusData.status || "Unknown error"}` }
        }
      }
      // Wait 1.5 seconds between polling
      await new Promise((r) => setTimeout(r, 1500))
    }

    // 3. Publish Media Container
    const publishEndpoint = `${GRAPH_BASE}/${encodeURIComponent(accountId)}/media_publish`
    const publishParams = new URLSearchParams({
      creation_id: creationId,
      access_token: token,
    })

    const publishRes = await fetch(`${publishEndpoint}?${publishParams.toString()}`, {
      method: "POST",
    })
    const publishData = await publishRes.json()

    if (!publishRes.ok || !publishData.id) {
      const err = publishData.error?.message || "Failed to publish media container to Instagram feed."
      return { ok: false, creationId, error: friendlyInstagramError(err) }
    }

    const mediaId = publishData.id as string

    // 4. Fetch the published post's permalink
    let permalink: string | undefined
    try {
      const mediaInfoRes = await fetch(
        `${GRAPH_BASE}/${encodeURIComponent(mediaId)}?fields=permalink&access_token=${encodeURIComponent(token)}`,
      )
      if (mediaInfoRes.ok) {
        const infoData = await mediaInfoRes.json()
        permalink = infoData.permalink
      }
    } catch {
      // Non-critical, fallback to standard Instagram URL
    }

    return {
      ok: true,
      creationId,
      mediaId,
      permalink: permalink || `https://www.instagram.com/`,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error during Instagram publication."
    return { ok: false, error: message }
  }
}

function friendlyInstagramError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("unsupported post request") || lower.includes("does not exist")) {
    return "Account ID not found. Ensure this is your Instagram Business Account ID (not your personal account ID or Facebook page ID)."
  }
  if (lower.includes("access token") || lower.includes("session has expired") || lower.includes("oauth")) {
    return "Meta Access Token is expired or invalid. Please generate a fresh token from Meta for Developers."
  }
  if (lower.includes("permissions") || lower.includes("scope")) {
    return "Missing required Meta permissions. Ensure your token includes 'instagram_content_publish' and 'instagram_basic'."
  }
  if (lower.includes("aspect ratio")) {
    return "Instagram requires image aspect ratio to be between 4:5 and 1.91:1 (our 1:1 square canvas is recommended)."
  }
  if (lower.includes("image url") || lower.includes("download")) {
    return "Instagram could not download the image. Ensure the image is hosted on a publicly accessible HTTPS URL."
  }
  return message
}
