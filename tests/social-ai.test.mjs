import { test } from "node:test"
import assert from "node:assert/strict"

import {
  generateSocialPostSync,
  verifyInstagramCredentialsSync,
  validateInstagramPublishParamsSync,
} from "./social-ai-runner.mjs"

test("social AI: generates complete campaign structure for all standard themes", () => {
  const campaigns = ["whistleblower", "hostel_mess", "fee_hike", "feature_spotlight", "strike_unity"]

  for (const campaign of campaigns) {
    const post = generateSocialPostSync({ campaignType: campaign })
    assert.ok(post.headline, `headline missing for ${campaign}`)
    assert.ok(post.subheadline, `subheadline missing for ${campaign}`)
    assert.ok(post.badge, `badge missing for ${campaign}`)
    assert.ok(Array.isArray(post.bulletPoints), `bulletPoints must be array for ${campaign}`)
    assert.ok(post.bulletPoints.length > 0, `bulletPoints must have items for ${campaign}`)
    assert.ok(post.statNumber, `statNumber missing for ${campaign}`)
    assert.ok(post.statLabel, `statLabel missing for ${campaign}`)
    assert.ok(post.cta, `cta missing for ${campaign}`)
    assert.ok(post.caption.length > 40, `caption too short for ${campaign}`)
    assert.ok(Array.isArray(post.hashtags), `hashtags must be array for ${campaign}`)
    assert.ok(post.hashtags.length >= 4, `hashtags should contain at least 4 tags for ${campaign}`)
    assert.ok(post.hashtags.every((tag) => tag.startsWith("#")), `all hashtags must start with # for ${campaign}`)
  }
})

test("social AI: handles custom campaign briefs correctly", () => {
  const customPrompt = "Demand 24/7 library access during end-semester examinations across universities"
  const post = generateSocialPostSync({
    campaignType: "custom",
    prompt: customPrompt,
    theme: "emerald",
  })

  assert.ok(post.headline.includes("library") || post.headline.includes("examinations") || post.headline.length > 0)
  assert.equal(post.colorTheme, "emerald")
  assert.ok(post.caption.includes("library") || post.caption.includes("Student Voice"))
  assert.ok(post.hashtags.includes("#StudentVoice"))
})

test("social AI: transforms live campus grievance into an Instagram social post", () => {
  const sourcePost = {
    id: "test-post-123",
    text: "Hostel block 4 water has been brown and contaminated for 5 days. Students are falling ill.",
    category: "Infrastructure",
    college: "State Institute of Technology",
    supportsCount: 240,
  }

  const post = generateSocialPostSync({
    sourcePost,
    theme: "crimson",
  })

  assert.ok(post.headline.includes("Grievance Spotlight"))
  assert.ok(post.subheadline.includes("State Institute of Technology"))
  assert.equal(post.badge, "INFRASTRUCTURE")
  assert.equal(post.statNumber, "240+")
  assert.equal(post.colorTheme, "crimson")
  assert.ok(post.caption.includes("State Institute of Technology"))
  assert.ok(post.caption.includes("brown and contaminated"))
})

test("instagram client: returns friendly error when credentials are missing", () => {
  const result1 = verifyInstagramCredentialsSync("", "")
  assert.equal(result1.ok, false)
  assert.ok(result1.error.includes("Access Token is missing"))

  const result2 = verifyInstagramCredentialsSync("valid_token", "")
  assert.equal(result2.ok, false)
  assert.ok(result2.error.includes("Account ID is missing"))

  const result3 = verifyInstagramCredentialsSync("valid_token", "17841400000000000")
  assert.equal(result3.ok, true)
  assert.equal(result3.account.id, "17841400000000000")
})

test("instagram client: rejects publishing with invalid image URLs or missing params", () => {
  const resMissing = validateInstagramPublishParamsSync({
    accessToken: "",
    instagramAccountId: "",
    imageUrl: "",
    caption: "test caption",
  })
  assert.equal(resMissing.ok, false)
  assert.ok(resMissing.error.includes("Missing Instagram credentials"))

  const resInvalidUrl = validateInstagramPublishParamsSync({
    accessToken: "mock_token",
    instagramAccountId: "mock_account_123",
    imageUrl: "ftp://not-an-https-url",
    caption: "test caption",
  })
  assert.equal(resInvalidUrl.ok, false)
  assert.ok(resInvalidUrl.error.includes("Invalid public image URL"))

  const resValid = validateInstagramPublishParamsSync({
    accessToken: "mock_token",
    instagramAccountId: "mock_account_123",
    imageUrl: "https://mysupabase.supabase.co/storage/v1/object/public/post-media/social/test.png",
    caption: "test caption",
  })
  assert.equal(resValid.ok, true)
})
