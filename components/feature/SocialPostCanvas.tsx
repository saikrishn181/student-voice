"use client"

import { useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from "react"
import type { GeneratedSocialPost, SocialTheme } from "@/lib/ai/gemini"

export interface SocialPostCanvasRef {
  exportDataUrl: () => string
  exportBlob: () => Promise<Blob | null>
  downloadImage: (filename?: string) => void
}

interface SocialPostCanvasProps {
  post: GeneratedSocialPost
  className?: string
  appHandle?: string
}

const THEME_CONFIGS: Record<
  SocialTheme,
  {
    bgStart: string
    bgMid: string
    bgEnd: string
    accent: string
    accentLight: string
    badgeBg: string
    badgeText: string
    cardBg: string
    cardBorder: string
  }
> = {
  midnight: {
    bgStart: "#090D16",
    bgMid: "#0F172A",
    bgEnd: "#020617",
    accent: "#F59E0B",
    accentLight: "#FDE68A",
    badgeBg: "rgba(245, 158, 11, 0.15)",
    badgeText: "#FBBF24",
    cardBg: "rgba(255, 255, 255, 0.05)",
    cardBorder: "rgba(245, 158, 11, 0.3)",
  },
  amber: {
    bgStart: "#451A03",
    bgMid: "#78350F",
    bgEnd: "#1C1917",
    accent: "#FBBF24",
    accentLight: "#FEF3C7",
    badgeBg: "rgba(251, 191, 36, 0.2)",
    badgeText: "#FDE68A",
    cardBg: "rgba(0, 0, 0, 0.25)",
    cardBorder: "rgba(251, 191, 36, 0.35)",
  },
  crimson: {
    bgStart: "#450A0A",
    bgMid: "#1E1B4B",
    bgEnd: "#0B0F19",
    accent: "#EF4444",
    accentLight: "#FCA5A5",
    badgeBg: "rgba(239, 68, 68, 0.2)",
    badgeText: "#F87171",
    cardBg: "rgba(0, 0, 0, 0.3)",
    cardBorder: "rgba(239, 68, 68, 0.35)",
  },
  emerald: {
    bgStart: "#022C22",
    bgMid: "#064E3B",
    bgEnd: "#020617",
    accent: "#10B981",
    accentLight: "#A7F3D0",
    badgeBg: "rgba(16, 185, 129, 0.2)",
    badgeText: "#34D399",
    cardBg: "rgba(0, 0, 0, 0.25)",
    cardBorder: "rgba(16, 185, 129, 0.35)",
  },
  violet: {
    bgStart: "#2E1065",
    bgMid: "#1E1B4B",
    bgEnd: "#0F172A",
    accent: "#C084FC",
    accentLight: "#F3E8FF",
    badgeBg: "rgba(192, 132, 252, 0.2)",
    badgeText: "#E9D5FF",
    cardBg: "rgba(0, 0, 0, 0.25)",
    cardBorder: "rgba(192, 132, 252, 0.35)",
  },
}

export const SocialPostCanvas = forwardRef<SocialPostCanvasRef, SocialPostCanvasProps>(
  ({ post, className, appHandle = "@studentvoice.in" }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const width = 1080
      const height = 1080
      canvas.width = width
      canvas.height = height

      const theme = THEME_CONFIGS[post.colorTheme] || THEME_CONFIGS.midnight

      // 1. Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, width, height)
      bgGrad.addColorStop(0, theme.bgStart)
      bgGrad.addColorStop(0.5, theme.bgMid)
      bgGrad.addColorStop(1, theme.bgEnd)
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Ambient radial glow top right
      const glowGrad = ctx.createRadialGradient(900, 150, 50, 900, 150, 500)
      glowGrad.addColorStop(0, theme.badgeBg)
      glowGrad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, width, height)

      // Subtle border frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)"
      ctx.lineWidth = 2
      ctx.strokeRect(40, 40, width - 80, height - 80)

      // 2. Top Header Row (Y: 90)
      const topY = 110

      // Brand Capsule
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)"
      drawRoundedRect(ctx, 80, topY - 32, 230, 46, 23)
      ctx.fill()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Brand Indicator Dot
      ctx.fillStyle = theme.accent
      ctx.beginPath()
      ctx.arc(104, topY - 9, 6, 0, Math.PI * 2)
      ctx.fill()

      // Brand Name
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "bold 20px 'DM Sans', system-ui, sans-serif"
      ctx.fillText("STUDENT VOICE", 122, topY - 2)

      // Category / Alert Badge
      const badgeText = (post.badge || "CAMPUS ALERT").toUpperCase()
      ctx.font = "bold 18px 'DM Sans', system-ui, sans-serif"
      const badgeWidth = ctx.measureText(badgeText).width + 36
      const badgeX = width - 80 - badgeWidth

      ctx.fillStyle = theme.badgeBg
      drawRoundedRect(ctx, badgeX, topY - 32, badgeWidth, 46, 23)
      ctx.fill()
      ctx.strokeStyle = theme.cardBorder
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.fillStyle = theme.badgeText
      ctx.fillText(badgeText, badgeX + 18, topY - 2)

      // 3. Headline with dynamic font size and word wrapping
      let currentY = 220
      const headline = post.headline.replace(/["“”]/g, "").trim()
      let fontSize = 54
      if (headline.length > 55) fontSize = 42
      if (headline.length > 80) fontSize = 36

      ctx.font = `bold ${fontSize}px 'DM Sans', system-ui, sans-serif`
      ctx.fillStyle = "#FFFFFF"

      const maxTextWidth = width - 160
      const headlineLines = wrapText(ctx, headline, maxTextWidth)

      headlineLines.forEach((line) => {
        ctx.fillText(line, 80, currentY)
        currentY += fontSize * 1.25
      })

      // 4. Subheadline / Pull Quote Box
      currentY += 20
      if (post.subheadline) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.04)"
        const subBoxHeight = 84
        drawRoundedRect(ctx, 80, currentY, width - 160, subBoxHeight, 16)
        ctx.fill()

        // Left accent indicator bar
        ctx.fillStyle = theme.accent
        drawRoundedRect(ctx, 80, currentY, 6, subBoxHeight, 3)
        ctx.fill()

        ctx.fillStyle = "#E2E8F0"
        ctx.font = "500 24px 'DM Sans', system-ui, sans-serif"
        const subLines = wrapText(ctx, post.subheadline, width - 210)
        if (subLines[0]) ctx.fillText(subLines[0], 106, currentY + 36)
        if (subLines[1]) ctx.fillText(subLines[1], 106, currentY + 68)

        currentY += subBoxHeight + 35
      } else {
        currentY += 25
      }

      // 5. Bullet Points Card
      const cardY = currentY
      const points = (post.bulletPoints || []).slice(0, 3)
      const pointCardHeight = 220

      ctx.fillStyle = theme.cardBg
      drawRoundedRect(ctx, 80, cardY, width - 160, pointCardHeight, 20)
      ctx.fill()
      ctx.strokeStyle = theme.cardBorder
      ctx.lineWidth = 1.5
      ctx.stroke()

      let pointY = cardY + 48
      points.forEach((point) => {
        // Bullet circle check icon
        ctx.fillStyle = theme.accent
        ctx.beginPath()
        ctx.arc(120, pointY - 7, 10, 0, Math.PI * 2)
        ctx.fill()

        // Inner white dot
        ctx.fillStyle = "#FFFFFF"
        ctx.beginPath()
        ctx.arc(120, pointY - 7, 4, 0, Math.PI * 2)
        ctx.fill()

        // Point text
        ctx.fillStyle = "#F1F5F9"
        ctx.font = "500 23px 'DM Sans', system-ui, sans-serif"
        const lineText = truncateText(ctx, point, width - 230)
        ctx.fillText(lineText, 150, pointY)

        pointY += 58
      })

      // 6. Stat Callout Bar (Y: 820)
      const statY = 825
      const statBoxWidth = width - 160
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)"
      drawRoundedRect(ctx, 80, statY, statBoxWidth, 90, 16)
      ctx.fill()
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Large Stat Number
      ctx.fillStyle = theme.accentLight
      ctx.font = "bold 38px 'DM Sans', system-ui, sans-serif"
      const statNumText = post.statNumber || "100%"
      ctx.fillText(statNumText, 110, statY + 56)

      const numWidth = ctx.measureText(statNumText).width

      // Divider line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)"
      ctx.beginPath()
      ctx.moveTo(110 + numWidth + 24, statY + 22)
      ctx.lineTo(110 + numWidth + 24, statY + 68)
      ctx.stroke()

      // Stat Label
      ctx.fillStyle = "#CBD5E1"
      ctx.font = "600 20px 'DM Sans', system-ui, sans-serif"
      ctx.fillText(post.statLabel || "Guaranteed Protection", 110 + numWidth + 48, statY + 52)

      // Verified check on right of stat box
      ctx.fillStyle = theme.accent
      ctx.font = "bold 16px 'DM Sans', system-ui, sans-serif"
      const verifiedText = "VERIFIED INITIATIVE"
      const vWidth = ctx.measureText(verifiedText).width
      ctx.fillText(verifiedText, width - 110 - vWidth, statY + 52)

      // 7. Bottom Footer Row (Y: 965)
      const footerY = 970

      // Handle on left
      ctx.fillStyle = "#94A3B8"
      ctx.font = "600 22px 'DM Sans', system-ui, sans-serif"
      ctx.fillText(appHandle, 80, footerY)

      // CTA Capsule button on right
      const ctaText = post.cta || "Raise your voice -> Link in bio"
      ctx.font = "bold 20px 'DM Sans', system-ui, sans-serif"
      const ctaWidth = ctx.measureText(ctaText).width + 48
      const ctaX = width - 80 - ctaWidth

      ctx.fillStyle = theme.accent
      drawRoundedRect(ctx, ctaX, footerY - 34, ctaWidth, 48, 24)
      ctx.fill()

      ctx.fillStyle = theme.bgStart === "#090D16" ? "#0F172A" : "#000000"
      ctx.fillText(ctaText, ctaX + 24, footerY - 3)
    }, [post, appHandle])

    useEffect(() => {
      renderCanvas()
    }, [renderCanvas])

    useImperativeHandle(
      ref,
      () => ({
        exportDataUrl: () => {
          if (!canvasRef.current) return ""
          return canvasRef.current.toDataURL("image/png")
        },
        exportBlob: async () => {
          if (!canvasRef.current) return null
          return new Promise<Blob | null>((resolve) => {
            canvasRef.current?.toBlob((blob) => resolve(blob), "image/png")
          })
        },
        downloadImage: (filename = "student-voice-post.png") => {
          if (!canvasRef.current) return
          const link = document.createElement("a")
          link.download = filename
          link.href = canvasRef.current.toDataURL("image/png")
          link.click()
        },
      }),
      [],
    )

    return (
      <div className={className}>
        <canvas
          ref={canvasRef}
          className="h-auto w-full rounded-2xl shadow-2xl transition-all duration-300"
          style={{ aspectRatio: "1 / 1", display: "block" }}
        />
      </div>
    )
  },
)

SocialPostCanvas.displayName = "SocialPostCanvas"

// Canvas utility functions
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ")
  const lines: string[] = []
  let currentLine = words[0] || ""

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    const width = ctx.measureText(currentLine + " " + word).width
    if (width < maxWidth) {
      currentLine += " " + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated.trim() + "..."
}
