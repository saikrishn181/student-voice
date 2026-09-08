"use client"

// Search page: server-backed search straight from Supabase.
// Before searching (empty query), displays all recent posts with optional state filtering.
// When a query is entered, dynamically searches posts (matched on text/state/#tag) and
// organizations (matched on name/bio).
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Search as SearchIcon, X, Users } from "lucide-react"
import { Input, Card, EmptyState, Spinner, Avatar } from "@/components/ui"
import { PostCard, VerifiedBadge, CollegeBadge, FollowButton } from "@/components/feature"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { usePostStore } from "@/lib/store/usePostStore"
import { useAuthStore } from "@/lib/store/useAuthStore"
import { useSearchStore } from "@/lib/store/useSearchStore"
import { useDebounce } from "@/hooks"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { rowToPost, type PostRow } from "@/lib/mappers"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { Post } from "@/lib/types"

// Quick state filter chips
const QUICK_STATES = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Uttar Pradesh", "West Bengal"]

interface AccountResult {
  id: string
  name: string
  username: string | null
  avatarUrl: string | null
  accountType: "student" | "organization"
  organizationType: string | null
  verificationStatus: "pending" | "verified" | "rejected" | null
  collegeName: string | null
  collegeVerified: boolean
  bio: string | null
  state: string | null
  followerCount: number
  isPrivate: boolean
}

function sanitizeSearchQuery(input: string): string {
  return input.replace(/[%_,.()"'\\]/g, " ").trim()
}

interface SearchResults {
  posts: Post[]
  accounts: AccountResult[]
}

function SearchPage() {
  const searchParams = useSearchParams()
  const currentUser = useAuthStore((s) => s.currentUser)
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const { recent, pushRecent, clearRecent } = useSearchStore()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [stateFilter, setStateFilter] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  // Pre-search default posts (before user types)
  const [defaultPosts, setDefaultPosts] = useState<Post[]>([])
  const [loadingDefault, setLoadingDefault] = useState(true)

  // Search results
  const [results, setResults] = useState<SearchResults>({ posts: [], accounts: [] })
  const [searching, setSearching] = useState(false)

  const isQueryActive = debouncedQuery.trim().length > 0

  // 1. Fetch default / all posts when no query is typed (or when stateFilter changes)
  useEffect(() => {
    if (isQueryActive) return
    let cancelled = false
    setLoadingDefault(true)

    const fetchAllPosts = async () => {
      const supabase = createSupabaseBrowserClient()
      let postQuery = supabase
        .from("posts")
        .select("*")
        .or("scheduled_for.is.null,scheduled_for.lte.now")
        .order("created_at", { ascending: false })
        .limit(50)

      if (stateFilter) {
        postQuery = postQuery.eq("state", stateFilter)
      }

      const { data, error } = await postQuery
      if (cancelled) return

      if (error || !data) {
        setDefaultPosts([])
      } else {
        const blocked = new Set(blockedUserIds)
        const rows = (data as PostRow[]).filter((r) => !blocked.has(r.author_id))
        setDefaultPosts(rows.map(rowToPost))
      }
      setLoadingDefault(false)
    }

    void fetchAllPosts()

    return () => {
      cancelled = true
    }
  }, [isQueryActive, stateFilter, blockedUserIds])

  // 2. Save non-empty queries to recent searches
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q) pushRecent(q)
  }, [debouncedQuery, pushRecent])

  // 3. Perform active search query when user types
  useEffect(() => {
    const rawQ = debouncedQuery.trim()
    if (!rawQ) {
      setResults({ posts: [], accounts: [] })
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)

    const supabase = createSupabaseBrowserClient()
    const isTag = rawQ.startsWith("#")
    const tagName = isTag ? sanitizeSearchQuery(rawQ.slice(1).toLowerCase()) : ""
    const isMention = rawQ.startsWith("@")
    const cleanUserQ = sanitizeSearchQuery(rawQ.replace(/^@+/, ""))
    const cleanQ = sanitizeSearchQuery(rawQ)

    if (!cleanQ && !tagName && !cleanUserQ) {
      setResults({ posts: [], accounts: [] })
      setSearching(false)
      return
    }

    // Query posts (unless query is explicitly an @username search)
    const fetchPosts = async () => {
      if (isMention) return { data: [] as PostRow[] }
      let postQuery = supabase
        .from("posts")
        .select("*")
        .or("scheduled_for.is.null,scheduled_for.lte.now")
        .order("created_at", { ascending: false })

      if (isTag && tagName) {
        postQuery = postQuery.contains("hashtags", [tagName])
      } else {
        postQuery = postQuery.or(`text.ilike.%${cleanQ}%,state.ilike.%${cleanQ}%`)
      }
      if (stateFilter) postQuery = postQuery.eq("state", stateFilter)
      return await postQuery.limit(30)
    }

    // Query accounts: search username, display name, and bio for all accounts (students & orgs)
    const fetchAccounts = async () => {
      const userSearchTerm = cleanUserQ || cleanQ
      let accountQuery = supabase
        .from("profiles")
        .select("id, name, username, avatar_url, account_type, organization_type, verification_status, college_name, college_verified, bio, state, follower_count, is_private")
        .or(`username.ilike.%${userSearchTerm}%,name.ilike.%${userSearchTerm}%,bio.ilike.%${userSearchTerm}%`)
        .limit(15)

      if (stateFilter && !isMention) {
        accountQuery = accountQuery.eq("state", stateFilter)
      }
      return await accountQuery
    }

    Promise.all([fetchPosts(), fetchAccounts()]).then(([postRes, accountRes]) => {
      if (cancelled) return
      const blocked = new Set(blockedUserIds)
      const postRows = ((postRes.data ?? []) as PostRow[]).filter(
        (r) => !blocked.has(r.author_id),
      )

      const rawAccounts = (accountRes.data ?? []).filter(
        (a: any) => !blocked.has(a.id),
      )

      // Sort accounts: exact username match first, then username prefix match, then follower count
      const userSearchTerm = cleanUserQ || cleanQ
      const qLower = userSearchTerm.toLowerCase()
      const sortedAccounts = [...rawAccounts].sort((a: any, b: any) => {
        const aUser = (a.username ?? "").toLowerCase()
        const bUser = (b.username ?? "").toLowerCase()
        const aExact = aUser === qLower
        const bExact = bUser === qLower
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1

        const aStarts = aUser.startsWith(qLower)
        const bStarts = bUser.startsWith(qLower)
        if (aStarts && !bStarts) return -1
        if (!aStarts && bStarts) return 1

        return (b.follower_count ?? 0) - (a.follower_count ?? 0)
      })

      const mappedAccounts: AccountResult[] = sortedAccounts.map((r: any) => ({
        id: r.id,
        name: r.name,
        username: r.username ?? null,
        avatarUrl: r.avatar_url ?? null,
        accountType: r.account_type,
        organizationType: r.organization_type ?? null,
        verificationStatus: r.verification_status ?? null,
        collegeName: r.college_name ?? null,
        collegeVerified: Boolean(r.college_verified),
        bio: r.bio ?? null,
        state: r.state ?? null,
        followerCount: r.follower_count ?? 0,
        isPrivate: Boolean(r.is_private),
      }))

      setResults({
        posts: postRows.map(rowToPost),
        accounts: mappedAccounts,
      })
      setSearching(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, stateFilter, blockedUserIds])

  const hasResults = results.posts.length > 0 || results.accounts.length > 0
  const hasFilters = Boolean(stateFilter)

  const clearFilters = () => {
    setStateFilter("")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">{s["search.title"]}</h1>

        {/* Search input */}
        <div className="relative">
          <Input
            label={s["search.placeholder"]}
            placeholder={s["search.placeholder"]}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftAdornment={<SearchIcon size={18} className="text-slate-400" />}
            rightAdornment={
              query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-app"
                >
                  <X size={15} />
                </button>
              ) : null
            }
          />
          {searching ? (
            <Spinner size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          ) : null}
        </div>

        {/* State filter chips */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {s["search.stateFilterLabel"]}
            </span>
            {QUICK_STATES.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStateFilter((prev) => (prev === st ? "" : st))}
                aria-pressed={stateFilter === st}
                className={cn(
                  "rounded-pill border px-3.5 py-1.5 text-xs font-medium transition-app",
                  stateFilter === st
                    ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {st}
              </button>
            ))}
            {hasFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-pill border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-app"
              >
                <X size={13} aria-hidden /> {s["search.clearFilters"]}
              </button>
            ) : null}
          </div>
        </div>

        {/* Recent searches (shown when query is empty and user has actual searches) */}
        {!isQueryActive && recent.length > 0 ? (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">{s["search.recent"]}</h2>
              <button
                type="button"
                onClick={clearRecent}
                className="text-xs font-medium text-primary-700 hover:underline"
              >
                {s["search.clearRecent"]}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {recent.map((term) => (
                <div
                  key={term}
                  className="inline-flex items-center rounded-pill border border-slate-200 bg-white pl-3 pr-1 py-0.5 text-xs text-slate-700 hover:bg-slate-50 transition-app shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => setQuery(term)}
                    className="font-medium text-slate-700 hover:text-primary-700 pr-1 py-1"
                  >
                    {term}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      useSearchStore.getState().removeRecent(term)
                    }}
                    aria-label={`Remove ${term}`}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-app"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ─── ACTIVE SEARCH RESULTS (when query is typed) ─── */}
        {isQueryActive ? (
          <>
            {searching ? (
              <div className="flex flex-col gap-4">
                <PostCardSkeleton count={2} />
              </div>
            ) : hasResults ? (
              <div className="flex flex-col gap-6">
                {/* Accounts (matching username, display name, bio) */}
                {results.accounts.length > 0 ? (
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-h4 font-semibold text-slate-900 flex items-center gap-2">
                        <Users size={18} className="text-primary-600" />
                        {s["search.accountsHeading"]}
                      </h2>
                      <span className="text-xs text-slate-400">
                        {results.accounts.length} {results.accounts.length === 1 ? "account" : "accounts"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {results.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between gap-3 p-3.5 rounded-card border border-[#E8E1D6] bg-white shadow-xs hover:border-primary-400 hover:shadow-card transition-all"
                        >
                          <Link
                            href={`/profile/${acc.id}`}
                            className="flex items-center gap-3 min-w-0 flex-1 group"
                          >
                            <Avatar name={acc.name} src={acc.avatarUrl} size="md" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="truncate text-sm font-bold text-slate-900 group-hover:text-primary-700 transition-colors">
                                  {acc.name}
                                </span>
                                {acc.accountType === "organization" && acc.verificationStatus === "verified" ? (
                                  <VerifiedBadge className="text-[11px] py-0 px-1.5" />
                                ) : null}
                                {acc.collegeVerified ? (
                                  <CollegeBadge className="text-[11px] py-0 px-1.5" />
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                {acc.username ? (
                                  <span className="font-semibold text-primary-600">@{acc.username}</span>
                                ) : (
                                  <span className="text-slate-400 capitalize">{acc.accountType}</span>
                                )}
                                {acc.collegeName ? (
                                  <span className="truncate text-slate-400">• {acc.collegeName}</span>
                                ) : acc.state ? (
                                  <span className="truncate text-slate-400">• {acc.state}</span>
                                ) : null}
                                <span className="text-slate-400 shrink-0">
                                  • {acc.followerCount} {acc.followerCount === 1 ? "follower" : "followers"}
                                </span>
                              </div>
                              {acc.bio ? (
                                <p className="mt-1 truncate text-xs text-slate-600">{acc.bio}</p>
                              ) : null}
                            </div>
                          </Link>

                          {currentUser?.id !== acc.id ? (
                            <div className="shrink-0">
                              <FollowButton
                                followerId={currentUser?.id ?? ""}
                                followingId={acc.id}
                                targetIsPrivate={acc.isPrivate}
                              />
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {results.posts.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-h4 font-semibold text-slate-900">
                      {s["search.postsHeading"]}
                    </h2>
                    <div className="flex flex-col gap-4">
                      {results.posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <EmptyState
                icon={SearchIcon}
                title={s["search.empty"]}
                description={`No results matching "${debouncedQuery.trim()}". Try different keywords or state.`}
              />
            )}
          </>
        ) : (
          /* ─── DEFAULT / PRE-SEARCH ALL POSTS (before user types) ─── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-h4 font-semibold text-slate-900">
                {stateFilter ? `Posts in ${stateFilter}` : s["search.allPostsHeading"]}
              </h2>
              <span className="text-xs text-slate-400">
                {defaultPosts.length > 0 ? `${defaultPosts.length} posts` : ""}
              </span>
            </div>

            {loadingDefault ? (
              <div className="flex flex-col gap-4">
                <PostCardSkeleton count={3} />
              </div>
            ) : defaultPosts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {defaultPosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={SearchIcon}
                title="No posts found"
                description={
                  stateFilter
                    ? `No posts available for ${stateFilter} yet.`
                    : "No posts have been published yet."
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// useSearchParams requires a Suspense boundary during static generation.
export default function SearchPageBoundary() {
  return (
    <Suspense fallback={null}>
      <SearchPage />
    </Suspense>
  )
}
