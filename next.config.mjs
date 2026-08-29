/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://fonts.googleapis.com"
  : "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://fonts.googleapis.com"

const nextConfig = {
  eslint: {
    // Prevent ESLint missing package from failing production builds on Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Consolidate all crawl/traffic signals on the custom domain: if Vercel
  // ever re-attaches the old *.vercel.app alias, every request permanently
  // redirects to https://krantind.xyz.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'krantind.vercel.app' }],
        destination: 'https://krantind.xyz/:path*',
        permanent: true,
      },
    ]
  },
  async headers() {
    return [
      // 1. Dynamic & Authenticated Endpoints: Prevent Web Cache Deception & Cache Poisoning
      {
        source: '/(api|messages|notifications|settings|profile)/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, private' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // 2. Web App Manifest MIME Type & Caching
      {
        source: '/manifest.json',
        headers: [
          { key: 'Content-Type', value: 'application/manifest+json; charset=utf-8' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // 3. Global Security Headers for all routes
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking / UI redressing
          { key: 'X-Frame-Options', value: 'DENY' },
          // Cross-Origin Isolation & Opener Policy
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          // Referrer policy: strict origin when cross-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Content Security Policy - strict script/style restriction with object-src none
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: https://*.supabase.co https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com",
              "connect-src 'self' https://*.supabase.co https://apis.google.com https://accounts.google.com wss://*.supabase.co",
              "frame-src 'self' https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Permissions Policy - restrict powerful browser sensors & hardware APIs
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
            ].join(', '),
          },
          // HSTS (HTTP Strict Transport Security)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Prevent Adobe Flash & PDF cross-domain
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
        ],
      },
    ]
  },
}

export default nextConfig