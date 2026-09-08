import type { Metadata, Viewport } from "next"
import { Fraunces, Manrope } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { ServiceWorkerRegistrar } from "@/components/layout/ServiceWorkerRegistrar"
import { PwaInstallPrompt } from "@/components/feature/PwaInstallPrompt"
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

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.krantind.xyz"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Krantind – Post the problem, get real support",
    template: "%s | Krantind",
  },
  description:
    "Krantind lets students and student organizations post campus problems and get real support from people in their state — region by region, problem by problem.",
  keywords: [
    "Krantind",
    "student problems",
    "campus issues",
    "student support",
    "India students",
    "student community",
    "post problems",
    "college help",
  ],
  applicationName: "Krantind",
  authors: [{ name: "Krantind" }],
  category: "Education",
  creator: "Krantind",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Krantind",
    title: "Krantind – Post the problem, get real support",
    description:
      "Students and student organizations post campus problems and get real support from people in their state.",
    locale: "en_IN",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Krantind — Student Voice Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Krantind – Post the problem, get real support",
    description:
      "Students and student organizations post campus problems and get real support from people in their state.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48 32x32 16x16" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Krantind",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F4E78",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="Krantind" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Krantind" />
        <meta
          name="description"
          content="Students and student organizations post campus problems and get real support from people in their state."
        />
        <meta name="theme-color" content="#1F4E78" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
        {/* Inline Service Worker registration for PWABuilder and PWA engine instant detection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .catch(function(err) { console.warn('SW registration failed:', err); });
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${manrope.variable} ${fraunces.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: "Krantind",
                  url: SITE_URL,
                  logo: `${SITE_URL}/icon.png`,
                  description:
                    "Krantind is a student-run platform where students and student organizations post campus problems and get real support from people in their state.",
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "Krantind",
                  description: metadata.description,
                  inLanguage: "en-IN",
                  publisher: { "@id": `${SITE_URL}/#organization` },
                  potentialAction: {
                    "@type": "SearchAction",
                    target: `${SITE_URL}/search?q={search_term_string}`,
                    "query-input": "required name=search_term_string",
                  },
                },
              ],
            }),
          }}
        />
        <AppShell>{children}</AppShell>
        {/* Global toast notifications render here on every page */}
        <Toaster />
        {/* Offline support (progressive web app) */}
        <ServiceWorkerRegistrar />
        <PwaInstallPrompt />
      </body>
    </html>
  )
}
