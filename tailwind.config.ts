import type { Config } from "tailwindcss"

// Design tokens for Krantind.
// Primary = deep Indigo (sleek, professional social media feel).
// Accent = engaging blue for interactions.
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
        // Primary — professional indigo/slate scheme
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca", // Base trust color
          800: "#3730a3",
          900: "#312e81",
        },
        // Accent — sleek interactions
        accent: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        // Neutral Slate for extremely clean UI backgrounds
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        // Success / info / neutral used by toasts & badges
        success: "#10b981", // modern emerald
        info: "#3b82f6",
      },
      fontFamily: {
        sans: [
          "Inter", // Assuming Inter or system-ui for that sleek SaaS/Social look
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