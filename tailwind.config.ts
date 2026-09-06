import type { Config } from "tailwindcss"

// Design tokens for Krantind.
// Primary = deep blue (#1F4E78) for trust/authority.
// Accent = warm orange/red for the Support button and urgent elements.
// Paper = warm off-white background (cream) — warmer than AI-grey slate,
// reads like a student notebook page.
// Display = Fraunces (warm editorial serif) for headlines; Sans = Manrope
// (rounded, friendly) for body. Slight imperfections = human-made feel.

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./constants/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary — deep blue (trust/authority). Base at 700 = #1F4E78.
        primary: {
          50: "#eef4fa",
          100: "#dce9f5",
          200: "#b9d3ea",
          300: "#8cb5d8",
          400: "#5f97c0",
          500: "#3c7aa6",
          600: "#2c6088",
          700: "#1F4E78",
          800: "#1a4063",
          900: "#12304b",
        },
        // Accent — warm orange/red (Support button, urgent elements)
        accent: {
          50: "#fef4ee",
          100: "#fde6d6",
          200: "#facdac",
          300: "#f7a97c",
          400: "#f37f4a",
          500: "#ed5f2a",
          600: "#d94a1a",
          700: "#b63a15",
          800: "#9a3016",
          900: "#7d2816",
        },
        // Paper — warm background (cream) and warm ink for text
        paper: "#FBF9F6",
        "paper-deep": "#F2ECE1",
        ink: "#24201B",
        "ink-muted": "#4A4239",
        // Success / info / neutral used by toasts & badges
        success: "#16a34a",
        info: "#2563eb",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        // Responsive typography scale (smaller on mobile, larger on desktop)
        display: ["clamp(2.25rem, 6vw, 3.5rem)", { lineHeight: "1.08", fontWeight: "700" }],
        h1: ["clamp(1.75rem, 5vw, 2.5rem)", { lineHeight: "1.12", fontWeight: "700" }],
        h2: ["clamp(1.375rem, 4vw, 1.875rem)", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["clamp(1.25rem, 3vw, 1.5rem)", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["clamp(1.125rem, 2.5vw, 1.25rem)", { lineHeight: "1.35", fontWeight: "600" }],
        // Body text sizes
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
      },
      borderRadius: {
        // Consistent rounded corners on all cards/buttons
        card: "1rem", // rounded-2xl equivalent — friendly but not over-round
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(36, 32, 27, 0.05), 0 2px 8px rgba(36, 32, 27, 0.05)",
        lift: "0 12px 28px -10px rgba(36, 32, 27, 0.18)",
        popover: "0 6px 16px rgba(36, 32, 27, 0.12), 0 2px 6px rgba(36, 32, 27, 0.08)",
        modal: "0 12px 40px rgba(36, 32, 27, 0.2), 0 4px 12px rgba(36, 32, 27, 0.1)",
        press: "inset 0 1px 3px rgba(36, 32, 27, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "heart-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.25)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 400ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "heart-pop": "heart-pop 250ms ease-out",
      },
      transitionDuration: {
        // Consistent 150-200ms ease transitions on all interactive elements
        fast: "150ms",
        DEFAULT: "200ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      maxWidth: {
        content: "72rem", // ResponsiveContainer max width on desktop
      },
    },
  },
  plugins: [],
}

export default config
