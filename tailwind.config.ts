import type { Config } from "tailwindcss"

// Design tokens for Krantind.
// Primary = deep blue (#1F4E78) for trust/authority.
// Accent = warm orange/red for the Support button and urgent elements.
// Keep usage consistent across ALL phases.

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
        // Success / info / neutral used by toasts & badges
        success: "#16a34a",
        info: "#2563eb",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        // Responsive typography scale (smaller on mobile, larger on desktop)
        display: ["clamp(2.25rem, 6vw, 3.5rem)", { lineHeight: "1.05", fontWeight: "700" }],
        h1: ["clamp(1.75rem, 5vw, 2.5rem)", { lineHeight: "1.15", fontWeight: "700" }],
        h2: ["clamp(1.375rem, 4vw, 2rem)", { lineHeight: "1.2", fontWeight: "700" }],
        h3: ["clamp(1.25rem, 3vw, 1.5rem)", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["clamp(1.125rem, 2.5vw, 1.25rem)", { lineHeight: "1.35", fontWeight: "600" }],
        // Body text sizes
        "body-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "400" }],
        body: ["1rem", { lineHeight: "1.6", fontWeight: "400" }],
        "body-lg": ["1.125rem", { lineHeight: "1.6", fontWeight: "400" }],
      },
      borderRadius: {
        // Consistent rounded corners on all cards/buttons
        card: "0.75rem", // rounded-xl equivalent for cards/buttons
        pill: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.05), 0 2px 6px rgba(16, 24, 40, 0.06)",
        popover: "0 6px 16px rgba(16, 24, 40, 0.14), 0 2px 6px rgba(16, 24, 40, 0.10)",
        modal: "0 12px 40px rgba(16, 24, 40, 0.22), 0 4px 12px rgba(16, 24, 40, 0.12)",
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