/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Prevent clickjacking
          { key: 'X-Frame-Options', value: 'DENY' },
          // Referrer policy: no referrer sent to external sites
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Content Security Policy - restrict scripts/styles to self, allow Supabase and Google Fonts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://www.gstatic.com https://fonts.googleapis.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: https://*.supabase.co https://lh3.googleusercontent.com https://platform-lookaside.fbsbx.com",
              "connect-src 'self' https://*.supabase.co https://apis.google.com https://accounts.google.com wss://*.supabase.co",
              "frame-src 'self' https://accounts.google.com",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
          // Permissions Policy - restrict powerful features
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
          // HSTS (only on HTTPS - Vercel provides HTTPS)
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          // Prevent Adobe Flash & PDF cross-domain
          { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
          // DNS prefetch control
          { key: 'X-DNS-Prefetch-Control', value: 'off' },
          // Expect-CT (optional, if using certificate transparency)
          { key: 'Expect-CT', value: 'max-age=86400, enforce' },
        ],
      },
    ]
  },
}

export default nextConfig