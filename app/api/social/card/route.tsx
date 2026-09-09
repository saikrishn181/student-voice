import { ImageResponse } from "next/og"
import type { NextRequest } from "next/server"

export const runtime = "edge"

const THEMES: Record<
  string,
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)

  const headline = searchParams.get("headline") || "Why Are Student Issues Kept in the Dark?"
  const subheadline =
    searchParams.get("subheadline") || "Over 78% of students fear retaliation when speaking out."
  const badge = (searchParams.get("badge") || "CAMPUS ALERT").toUpperCase()
  const bullet1 = searchParams.get("b1") || "Zero identity leaks with end-to-end author masking"
  const bullet2 = searchParams.get("b2") || "Verified student organization escalation desk"
  const bullet3 = searchParams.get("b3") || "Statewide campus grievance resolution tracking"
  const statNumber = searchParams.get("stat") || "100%"
  const statLabel = searchParams.get("label") || "Protected Anonymity"
  const cta = searchParams.get("cta") || "Raise your voice -> Link in bio"
  const handle = searchParams.get("handle") || "@studentvoice.in"
  const themeKey = searchParams.get("theme") || "midnight"

  const theme = THEMES[themeKey] || THEMES.midnight

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1080px",
          height: "1080px",
          backgroundColor: theme.bgStart,
          backgroundImage: `linear-gradient(135deg, ${theme.bgStart} 0%, ${theme.bgMid} 50%, ${theme.bgEnd} 100%)`,
          padding: "60px 80px",
          justifyContent: "space-between",
          color: "#FFFFFF",
          fontFamily: "system-ui, sans-serif",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Subtle Frame Border */}
        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "40px",
            right: "40px",
            bottom: "40px",
            border: "2px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            pointerEvents: "none",
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          {/* Brand Capsule */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "30px",
              padding: "10px 24px",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: theme.accent,
              }}
            />
            <span
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                letterSpacing: "1.5px",
              }}
            >
              STUDENT VOICE
            </span>
          </div>

          {/* Category Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: theme.badgeBg,
              border: `1.5px solid ${theme.cardBorder}`,
              borderRadius: "30px",
              padding: "10px 24px",
              color: theme.badgeText,
              fontSize: "18px",
              fontWeight: "bold",
              letterSpacing: "1px",
            }}
          >
            {badge}
          </div>
        </div>

        {/* Core Content: Headline & Subheadline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: headline.length > 60 ? "46px" : "56px",
              fontWeight: "900",
              lineHeight: 1.15,
              letterSpacing: "-0.5px",
              color: "#FFFFFF",
            }}
          >
            {headline}
          </div>

          {/* Subheadline Quote Box */}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              borderRadius: "16px",
              padding: "18px 24px",
              borderLeft: `6px solid ${theme.accent}`,
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "22px",
                fontWeight: "500",
                color: "#E2E8F0",
                lineHeight: 1.35,
              }}
            >
              {subheadline}
            </div>
          </div>
        </div>

        {/* Bullet Points Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: theme.cardBg,
            border: `1.5px solid ${theme.cardBorder}`,
            borderRadius: "20px",
            padding: "28px 36px",
            gap: "18px",
          }}
        >
          {[bullet1, bullet2, bullet3].map((pt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  backgroundColor: theme.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "22px",
                  fontWeight: "500",
                  color: "#F1F5F9",
                }}
              >
                {pt}
              </span>
            </div>
          ))}
        </div>

        {/* Stat Callout Strip */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(0, 0, 0, 0.45)",
            border: "1.5px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "18px",
            padding: "20px 32px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: "900",
                color: theme.accentLight,
              }}
            >
              {statNumber}
            </span>
            <div
              style={{
                width: "2px",
                height: "36px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
              }}
            />
            <span
              style={{
                fontSize: "20px",
                fontWeight: "600",
                color: "#CBD5E1",
              }}
            >
              {statLabel}
            </span>
          </div>

          <span
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              color: theme.accent,
              letterSpacing: "1px",
            }}
          >
            VERIFIED INITIATIVE
          </span>
        </div>

        {/* Bottom Footer Row */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            marginTop: "10px",
          }}
        >
          <span
            style={{
              fontSize: "22px",
              fontWeight: "600",
              color: "#94A3B8",
            }}
          >
            {handle}
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: theme.accent,
              color: theme.bgStart === "#090D16" ? "#0F172A" : "#000000",
              borderRadius: "26px",
              padding: "12px 28px",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            {cta}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    },
  )
}
