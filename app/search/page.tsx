"use client"

// Search page: server-backed search straight from Supabase.
// Before searching (empty query), displays all recent posts with optional state filtering.
// When a query is entered, dynamically searches posts (matched on text/state/#tag) and
// organizations (matched on name/bio).
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Search as SearchIcon, X, Sparkles } from "lucide-react"
import { Input, Card, EmptyState, Spinner } from "@/components/ui"
import { PostCard } from "@/components/feature"
import { PostCardSkeleton } from "@/components/feature/PostCardSkeleton"
import { usePostStore } from "@/lib/store/usePostStore"
import { useSearchStore } from "@/lib/store/useSearchStore"
import { useDebounce } from "@/hooks"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { rowToPost, type PostRow } from "@/lib/mappers"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { Post } from "@/lib/types"

// Quick state filter chips
const QUICK_STATES = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Uttar Pradesh", "West Bengal"]

interface OrgRow {
  id: string
  name: string
  bio: string | null
  state: string | null
}

function sanitizeSearchQuery(input: string): string {
  return input.replace(/[%_,.()"'\\]/g, " ").trim()
}

interface SearchResults {
  posts: Post[]
  orgs: OrgRow[]
}

function SearchPage() {
  const searchParams = useSearchParams()
  const blockedUserIds = usePostStore((s) => s.blockedUserIds)
  const { recent, pushRecent, clearRecent } = useSearchStore()
  const [query, setQuery] = useState(searchParams.get("q") ?? "")
  const [stateFilter, setStateFilter] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  // Pre-search default posts (before user types)
  const [defaultPosts, setDefaultPosts] = useState<Post[]>([])
  const [loadingDefault, setLoadingDefault] = useState(true)

  // Search results
  const [results, setResults] = useState<SearchResults>({ posts: [], orgs: [] })
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
    const q = debouncedQuery.trim()
    if (!q) {
      setResults({ posts: [], orgs: [] })
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)

    const supabase = createSupabaseBrowserClient()
    const isTag = q.startsWith("#")
    const tagName = isTag ? sanitizeSearchQuery(q.slice(1).toLowerCase()) : ""
    const cleanQ = sanitizeSearchQuery(q)

    if (!cleanQ && !tagName) {
      setResults({ posts: [], orgs: [] })
      setSearching(false)
      return
    }

    const postQuery = supabase
      .from("posts")
      .select("*")
      .or("scheduled_for.is.null,scheduled_for.lte.now")
      .order("created_at", { ascending: false })

    if (isTag && tagName) {
      postQuery.contains("hashtags", [tagName])
    } else {
      postQuery.or(`text.ilike.%${cleanQ}%,state.ilike.%${cleanQ}%`)
    }
    if (stateFilter) postQuery.eq("state", stateFilter)
    postQuery.limit(30)

    const orgQuery = supabase
      .from("profiles")
      .select("id, name, bio, state")
      .eq("account_type", "organization")
      .or(`name.ilike.%${cleanQ}%,bio.ilike.%${cleanQ}%`)
      .limit(10)

    Promise.all([postQuery, orgQuery]).then(([postRes, orgRes]) => {
      if (cancelled) return
      const blocked = new Set(blockedUserIds)
      const rows = ((postRes.data ?? []) as PostRow[]).filter(
        (r) => !blocked.has(r.author_id),
      )
      setResults({
        posts: rows.map(rowToPost),
        orgs: (orgRes.data ?? []) as OrgRow[],
      })
      setSearching(false)
    })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, stateFilter, blockedUserIds])

  const hasResults = results.posts.length > 0 || results.orgs.length > 0
  const hasFilters = Boolean(stateFilter)

  const clearFilters = () => {
    setStateFilter("")
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-h2 text-slate-900">{s["search.title"]}</h1>
        </div>

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
                {results.orgs.length > 0 ? (
                  <section>
                    <h2 className="mb-3 text-h4 font-semibold text-slate-900">
                      {s["search.organizationsHeading"]}
                    </h2>
                    <div className="flex flex-col gap-2.5">
                      {results.orgs.map((org) => (
                        <Card key={org.id} className="flex items-center gap-3 p-3.5">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                            {org.name.charAt(0)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">{org.name}</p>
                            <p className="truncate text-xs text-slate-400">{org.bio ?? org.state}</p>
                          </div>
                        </Card>
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
