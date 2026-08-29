// Edge middleware: refreshes the Supabase auth session cookie on every request
// and enforces server-side route protection — logged-out users are redirected
// to /login before the page renders (no client-only guard).
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/forgot-password",
  "/reset-password",
  "/login",
  "/signup",
  "/auth/callback",
  "/manifest.json",
  "/manifest.webmanifest",
  "/sw.js",
  "/robots.txt",
  "/sitemap.xml",
  "/privacy",
  "/terms",
  "/guidelines",
  "/contact",
  "/faq",
]

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const path = request.nextUrl.pathname

  // Fast path for PWA assets, static files, and icons
  if (
    path === "/manifest.json" ||
    path === "/manifest.webmanifest" ||
    path === "/sw.js" ||
    path.startsWith("/screenshots/") ||
    path.startsWith("/_next/") ||
    path.startsWith("/api/") ||
    /\.(?:json|js|png|ico|svg|jpg|jpeg|webp|txt|xml|html)$/i.test(path)
  ) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const isPublicRoute = PUBLIC_ROUTES.includes(path)

  // Important: always call getUser() so the session cookie is refreshed.
  const { data } = await supabase.auth.getUser()
  const isAuthenticated = Boolean(data.user)

  // Every non-public route requires a logged-in user. Redirect to /login so the
  // protection doesn't depend on client-side JavaScript.
  if (!isPublicRoute && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("next", path)
    return NextResponse.redirect(url)
  }

  // A signed-in user hitting an auth page is bounced to the feed instead.
  const AUTH_ONLY_GUEST_PAGES = ["/login", "/signup", "/forgot-password", "/reset-password"]
  if (AUTH_ONLY_GUEST_PAGES.includes(path) && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = "/feed"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|sw.js|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html|json|js)$).*)",
  ],
}