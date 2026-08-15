import type { Metadata, Viewport } from "next"
import { Fraunces, Manrope } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/Toast"

// Warm editorial serif for headlines — human, not template-y.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
})

// Rounded, friendly sans for body copy.
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Krantind – Real support for students",
  description:
    "Krantind lets students and student organizations post problems and get real support from their community, region by region.",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${fraunces.variable} font-sans antialiased`}>
        <AppShell>{children}</AppShell>
        {/* Global toast notifications render here on every page */}
        <Toaster />
      </body>
    </html>
  )
}
