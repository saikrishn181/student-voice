import type { MetadataRoute } from "next"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.krantind.xyz"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated-only areas: nothing useful for crawlers.
      disallow: ["/feed", "/messages", "/notifications", "/settings", "/admin", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
