"use client"

// Search page: text search across posts + orgs, with recent searches.
// Filters the Supabase-backed stores in real time.
import { useMemo, useState } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input, Card, EmptyState } from "@/components/ui"
import { PostCard } from "@/components/feature"
import { usePostStore } from "@/lib/store/usePostStore"
import { useSearchStore } from "@/lib/store/useSearchStore"
import { useUserStore } from "@/lib/store/useUserStore"
import { useDebounce } from "@/hooks"
import s from "@/lib/strings"

export default function SearchPage() {
  const posts = usePostStore((s) => s.posts)
  const users = useUserStore((s) => s.users)
  const { recent, pushRecent, clearRecent } = useSearchStore()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  const results = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return { posts: [], orgs: [] }
    return {
      posts: posts.filter(
        (p) =>
          p.text.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.state.toLowerCase().includes(q),
      ),
      orgs: Object.values(users).filter(
        (u) =>
          u.accountType === "organization" &&
          (u.name.toLowerCase().includes(q) || u.bio?.toLowerCase().includes(q)),
      ),
    }
  }, [debouncedQuery, posts, users])

  const hasQuery = debouncedQuery.trim().length > 0
  const hasResults = results.posts.length > 0 || results.orgs.length > 0

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

        {/* Recent searches (shown when no active query) */}
        {!hasQuery && recent.length > 0 ? (
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