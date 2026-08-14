"use client"

// Search page: text search across posts + orgs, with recent searches.
// Filters the Supabase-backed stores in real time. Extra category/state
// filters narrow post results.
import { useMemo, useState } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input, Card, EmptyState } from "@/components/ui"
import { PostCard } from "@/components/feature"
import { usePostStore } from "@/lib/store/usePostStore"
import { useSearchStore } from "@/lib/store/useSearchStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useDebounce } from "@/hooks"
import { CATEGORIES } from "@/constants"
import s from "@/lib/strings"
import { cn } from "@/lib/utils"

// A couple of commonly filtered states to keep the chip bar short.
const QUICK_STATES = ["Maharashtra", "Karnataka", "Delhi", "Tamil Nadu", "Uttar Pradesh", "West Bengal"]

export default function SearchPage() {
  const posts = usePostStore((s) => s.posts)
  const users = useUserStore((s) => s.users)
  const { recent, pushRecent, clearRecent } = useSearchStore()
  const [query, setQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<"" | typeof CATEGORIES[number]["value"]>("")
  const [stateFilter, setStateFilter] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return { posts: [], orgs: [] }
    const matchedPosts = posts.filter(
      (p) =>
        p.text.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q),
    )
    return {
      posts: matchedPosts.filter(
        (p) =>
          (!categoryFilter || p.category === categoryFilter) &&
          (!stateFilter || p.state === stateFilter),
      ),
      orgs: Object.values(users).filter(
        (u) =>
          u.accountType === "organization" &&
          (u.name.toLowerCase().includes(q) || u.bio?.toLowerCase().includes(q)),
      ),
    }
  }, [debouncedQuery, posts, users, categoryFilter, stateFilter])

  const hasQuery = debouncedQuery.trim().length > 0
  const hasResults = results.posts.length > 0 || results.orgs.length > 0
  const hasFilters = Boolean(categoryFilter || stateFilter)
  const hasAnyQuery = hasQuery || hasFilters

  const clearFilters = () => {
    setCategoryFilter("")
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
        </div>

        {/* Quick filters (visible as soon as there is any search activity) */}
        {hasAnyQuery ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Category
              </span>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setCategoryFilter((prev) => (prev === c.value ? "" : c.value))
                  }
                  aria-pressed={categoryFilter === c.value}
                  className={cn(
                    "rounded-pill border px-3 py-1 text-sm transition-app",
                    categoryFilter === c.value
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  style={{ minHeight: 40 }}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
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
                    "rounded-pill border px-3 py-1.5 text-sm transition-app",
                    stateFilter === st
                      ? "border-primary-600 bg-primary-600 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                  style={{ minHeight: 40 }}
                >
                  {st}
                </button>
              ))}
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-pill border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50"
                  style={{ minHeight: 40 }}
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

        {hasQuery && !hasResults ? (
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