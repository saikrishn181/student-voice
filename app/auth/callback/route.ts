// OAuth callback route: Google (and future providers) bounce the user here
// after the consent screen with a `code` (PKCE flow). We exchange it for a
// session cookie, then send the user to their next destination.
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { LOGGED_IN_HOME, POST_SIGNUP_ROUTE } from "@/constants"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  if (!code) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const supabase = await createSupabaseServerClient()

  // Exchange the authorization code for a session. This sets the auth cookies
  // that middleware + the client stores will pick up on the next request.
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !sessionData.session) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url))
  }

  // New Google users have a profile row (created by the DB trigger) but no
  // state yet, so they must pick one before browsing the feed.
  const userId = sessionData.session.user.id
  const userEmail = sessionData.session.user.email ?? ""
  const { data: profile } = await supabase
    .from("profiles")
    .select("state, name")
    .eq("id", userId)
    .maybeSingle()

  const hasRegion = Boolean(profile?.state)
  if (!hasRegion) {
    return NextResponse.redirect(new URL(POST_SIGNUP_ROUTE, request.url))
  }

  // Returning user: require entering password after selecting Google mail
  const confirmUrl = new URL("/login", request.url)
  confirmUrl.searchParams.set("google_confirm", "true")
  if (userEmail) confirmUrl.searchParams.set("email", userEmail)
  if (profile?.name) confirmUrl.searchParams.set("name", profile.name)
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) {
    confirmUrl.searchParams.set("next", next)
  }

  return NextResponse.redirect(confirmUrl)
}