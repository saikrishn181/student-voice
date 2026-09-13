// OAuth callback route: Google (and future providers) bounce the user here
// after the consent screen with a `code` (PKCE flow). We exchange it for a
// session cookie, then send the user to their next destination.
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { LOGGED_IN_HOME, POST_SIGNUP_ROUTE } from "@/constants"
import { getSafeRedirect } from "@/lib/utils"

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

  // Returning user: redirect directly to the requested page or the home feed.
  const targetPath = next ? getSafeRedirect(next, LOGGED_IN_HOME) : LOGGED_IN_HOME
  return NextResponse.redirect(new URL(targetPath, request.url))
}