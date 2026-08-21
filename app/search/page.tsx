"use client"

// Search page: server-backed search straight from Supabase — posts matched on
// text/state (or a #tag), orgs matched on name/bio. Debounced, with a state
// filter chip bar and recent searches.
import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Search as SearchIcon, X } from "lucide-react"
import { Input, Card, EmptyState, Spinner } from "@/components/ui"
import { PostCard } from "@/components/feature"
import { usePostStore } from "@/lib/store/usePostStore"
import { useSearchStore } from "@/lib/store/useSearchStore"
import { useDebounce } from "@/hooks"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { rowToPost, type PostRow } from "@/lib/mappers"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"
import type { Post } from "@/lib/types"

// A couple of commonly filtered states to keep the chip bar short.
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

interface Results {
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

  const [results, setResults] = useState<Results>({ posts: [], orgs: [] })
  const [searching, setSearching] = useState(false)

  // Save non-empty queries to recent searches.
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q) pushRecent(q)
  }, [debouncedQuery, pushRecent])

  // Query Supabase directly so search covers the whole database, not just the
  // posts the feed has loaded into memory.
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q.length < 2) {
      setResults({ posts: [], orgs: [] })
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

  const hasQuery = debouncedQuery.trim().length > 0
  const hasResults = results.posts.length > 0 || results.orgs.length > 0
  const hasFilters = Boolean(stateFilter)
  const hasAnyQuery = hasQuery || hasFilters

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
          />
          {searching ? (
            <Spinner size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          ) : null}
        </div>

        {/* Quick filters (visible as soon as there is any search activity) */}
        {hasAnyQuery ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                State
              </span>
              {QUICK_STATES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStateFilter((prev) => (prev === st ? "" : st))}
                  aria-pressed={stateFilter === st}
                  className={cn(
                    "rounded-pill border px-4 min-h-[44px] text-sm transition-app",
                    stateFilter === st
                      ? "border-primary-600 bg-primary-600 text-white"
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
                  className="flex items-center gap-1 rounded-pill border border-slate-200 px-4 min-h-[44px] text-sm font-medium text-slate-500 hover:bg-slate-50"
                >
                  <X size={14} aria-hidden /> Clear filters
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Recent searches (shown when no active query) */}
        {!hasAnyQuery && recent.length > 0 ? (
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-h4">{s["search.recent"]}</h2>
              <button
                type="button"
                onClick={clearRecent}
                className="text-sm font-medium text-primary-700 hover:underline"
              >
                {s["search.clearRecent"]}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recent.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-pill border border-slate-200 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50"
                  style={{ minHeight: 44 }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Results */}
        {hasQuery && hasResults ? (
          <div className="flex flex-col gap-4">
            {results.orgs.length > 0 ? (
              <section>
                <h2 className="mb-3 text-h4">{s["search.organizationsHeading"]}</h2>
                {results.orgs.map((org) => (
                  <Card key={org.id} className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {org.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{org.name}</p>
                      <p className="truncate text-xs text-slate-400">{org.bio ?? org.state}</p>
                    </div>
                  </Card>
                ))}
              </section>
            ) : null}

            {results.posts.length > 0 ? (
              <section>
                <h2 className="mb-3 text-h4">{s["search.postsHeading"]}</h2>
                <div className="flex flex-col gap-4">
                  {results.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {hasQuery && !searching && !hasResults ? (
          <EmptyState
            icon={SearchIcon}
            title={s["search.empty"]}
            description={`No results for "${debouncedQuery.trim()}"`}
          />
        ) : null}
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
