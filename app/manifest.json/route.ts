import { NextResponse } from "next/server"

export const dynamic = "force-static"

const MANIFEST_DATA = {
  id: "/feed",
  name: "Krantind — Student Voice Platform",
  short_name: "Krantind",
  description: "Students and student organizations post campus problems and get real support from people in their state.",
  start_url: "/feed",
  scope: "/",
  display: "standalone",
  display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
  background_color: "#FAF7F2",
  theme_color: "#1F4E78",
  orientation: "portrait-primary",
  lang: "en-IN",
  dir: "ltr",
  categories: ["education", "social", "community", "productivity"],
  prefer_related_applications: false,
  icons: [
    {
      src: "/favicon.ico",
      sizes: "48x48 32x32 16x16",
      type: "image/x-icon"
    },
    {
      src: "/icon-96.png",
      sizes: "96x96",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-144.png",
      sizes: "144x144",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-maskable-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "maskable"
    },
    {
      src: "/icon.png",
      sizes: "256x256",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-384.png",
      sizes: "384x384",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    },
    {
      src: "/icon-maskable-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable"
    },
    {
      src: "/logo.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any"
    }
  ],
  screenshots: [
    {
      src: "/screenshots/desktop.png",
      sizes: "1280x720",
      type: "image/png",
      form_factor: "wide",
      label: "Krantind Feed and Issue Tracker on Desktop"
    },
    {
      src: "/screenshots/mobile.png",
      sizes: "750x1334",
      type: "image/png",
      form_factor: "narrow",
      label: "Krantind Mobile Student Community"
    }
  ],
  shortcuts: [
    {
      name: "Campus Feed",
      short_name: "Feed",
      description: "View the latest campus issues in your state",
      url: "/feed",
      icons: [{ src: "/icon-192.png", sizes: "192x192" }]
    },
    {
      name: "Post a Problem",
      short_name: "Post",
      description: "Create and post a new campus problem",
      url: "/post/create",
      icons: [{ src: "/icon-192.png", sizes: "192x192" }]
    },
    {
      name: "Messages",
      short_name: "Chat",
      description: "Direct student messaging and discussions",
      url: "/messages",
      icons: [{ src: "/icon-192.png", sizes: "192x192" }]
    },
    {
      name: "Impact Tracker",
      short_name: "Impact",
      description: "See resolved campus issues and community impact",
      url: "/impact",
      icons: [{ src: "/icon-192.png", sizes: "192x192" }]
    }
  ]
}

export function GET() {
  return new NextResponse(JSON.stringify(MANIFEST_DATA), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  })
}
