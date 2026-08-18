import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Krantind – Post the problem, get real support",
    short_name: "Krantind",
    description:
      "Students and student organizations post campus problems and get real support from people in their state.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F2",
    theme_color: "#1F4E78",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
