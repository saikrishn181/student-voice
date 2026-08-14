import type { Metadata, Viewport } from "next"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { Toaster } from "@/components/ui/Toast"

export const metadata: Metadata = {
  title: "Krantind — Real support for students",
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
      <body>
        <AppShell>{children}</AppShell>
        {/* Global toast notifications render here on every page */}
        <Toaster />
      </body>
    </html>
  )
}