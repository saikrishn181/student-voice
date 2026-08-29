import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/feed",
    name: "Krantind — Student Voice Platform",
    short_name: "Krantind",
    description:
      "Students and student organizations post campus problems and get real support from people in their state.",
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
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48 32x32 16x16",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Campus Feed",
        short_name: "Feed",
        description: "View the latest campus issues in your state",
        url: "/feed",
        icons: [{ src: "/icon.png", sizes: "256x256" }],
      },
      {
        name: "Post a Problem",
        short_name: "Post",
        description: "Create and post a new campus problem",
        url: "/post/create",
        icons: [{ src: "/icon.png", sizes: "256x256" }],
      },
      {
        name: "Messages",
        short_name: "Chat",
        description: "Direct student messaging and discussions",
        url: "/messages",
        icons: [{ src: "/icon.png", sizes: "256x256" }],
      },
      {
        name: "Impact Tracker",
        short_name: "Impact",
        description: "See resolved campus issues and community impact",
        url: "/impact",
        icons: [{ src: "/icon.png", sizes: "256x256" }],
      },
    ],
  }
}

